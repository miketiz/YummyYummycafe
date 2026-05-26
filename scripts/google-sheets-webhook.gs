const CONFIG = {
  secret: "CHANGE_ME_TO_MATCH_GOOGLE_SHEET_WEBHOOK_SECRET",
  ordersSheetName: "Orders",
  dashboardSheetName: "Dashboard",
};

const ORDER_HEADERS = [
  "created_at",
  "order_number",
  "source",
  "customer_name",
  "phone_number",
  "items",
  "delivery_type",
  "delivery_address",
  "subtotal",
  "delivery_fee",
  "total_price",
  "payment_method",
  "payment_status",
  "order_status",
  "notes",
  "admin_note",
  "updated_at",
];

function setupYummyYummyOrderSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const ordersSheet = getOrCreateSheet_(spreadsheet, CONFIG.ordersSheetName);
  const dashboardSheet = getOrCreateSheet_(spreadsheet, CONFIG.dashboardSheetName);

  setupOrdersSheet_(ordersSheet);
  setupDashboardSheet_(dashboardSheet, ordersSheet);

  SpreadsheetApp.getUi().alert("YummyYummy order sheet is ready.");
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");

    if (!payload.secret || payload.secret !== CONFIG.secret) {
      return json_({ ok: false, error: "Unauthorized" }, 401);
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const ordersSheet = getOrCreateSheet_(spreadsheet, CONFIG.ordersSheetName);
    ensureOrdersSheetReady_(ordersSheet);

    if (payload.action === "update_order_status") {
      updateOrderStatus_(ordersSheet, payload.order || {});
    } else {
      appendOrder_(ordersSheet, payload.order || {});
    }

    return json_({ ok: true }, 200);
  } catch (error) {
    return json_({ ok: false, error: String(error) }, 500);
  }
}

function appendOrder_(sheet, order) {
  const items = Array.isArray(order.items)
    ? order.items.map((item) => `${item.menu_item_name || item.name || "-"} x${item.quantity || 1}`).join("; ")
    : "";

  const subtotal = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0)
    : Number(order.subtotal || 0);

  const row = [
    order.created_at || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"),
    order.order_number || "",
    order.source || "website",
    order.customer_name || "",
    order.phone_number || "",
    items,
    order.delivery_type || "",
    order.delivery_address || "",
    subtotal,
    Number(order.delivery_fee || 0),
    Number(order.total_price || 0),
    order.payment_method || "",
    order.payment_status || "unpaid",
    order.order_status || order.status || "pending",
    order.notes || "",
    order.admin_note || "",
    order.updated_at || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"),
  ];

  sheet.appendRow(row);
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 9, 1, 3).setNumberFormat("#,##0.00");
  sheet.getRange(lastRow, 1, 1, ORDER_HEADERS.length).setBorder(false, false, true, false, false, false, "#e5e7eb", SpreadsheetApp.BorderStyle.SOLID);
}

function updateOrderStatus_(sheet, order) {
  const orderNumber = String(order.order_number || "").trim();
  if (!orderNumber) {
    throw new Error("order_number is required");
  }

  const rowIndex = findOrderRow_(sheet, orderNumber);
  if (!rowIndex) {
    appendOrder_(sheet, order);
    return;
  }

  if (order.payment_status) {
    sheet.getRange(rowIndex, 13).setValue(order.payment_status);
  }

  if (order.order_status || order.status) {
    sheet.getRange(rowIndex, 14).setValue(order.order_status || order.status);
  }

  if (order.admin_note !== undefined) {
    sheet.getRange(rowIndex, 16).setValue(order.admin_note || "");
  }

  sheet.getRange(rowIndex, 17).setValue(order.updated_at || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"));
  sheet.getRange(rowIndex, 1, 1, ORDER_HEADERS.length).setBorder(false, false, true, false, false, false, "#e5e7eb", SpreadsheetApp.BorderStyle.SOLID);
}

function findOrderRow_(sheet, orderNumber) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  const target = String(orderNumber).trim().toUpperCase();
  for (let index = 0; index < values.length; index += 1) {
    const current = String(values[index][0] || "").trim().toUpperCase();
    if (current === target) {
      return index + 2;
    }
  }

  return null;
}

function setupOrdersSheet_(sheet) {
  sheet.clearFormats();

  const headerRange = sheet.getRange(1, 1, 1, ORDER_HEADERS.length);
  headerRange.setValues([ORDER_HEADERS]);
  headerRange
    .setBackground("#2f6f4e")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, ORDER_HEADERS.length, 140);
  sheet.setColumnWidth(6, 280);
  sheet.setColumnWidth(8, 260);
  sheet.setColumnWidth(15, 240);
  sheet.setColumnWidth(16, 220);

  const paymentRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["unpaid", "paid"], true)
    .setAllowInvalid(false)
    .build();

  const orderStatusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"], true)
    .setAllowInvalid(false)
    .build();

  sheet.getRange("M2:M1000").setDataValidation(paymentRule);
  sheet.getRange("N2:N1000").setDataValidation(orderStatusRule);
  sheet.getRange("I2:K1000").setNumberFormat("#,##0.00");
  sheet.getRange("A2:A1000").setNumberFormat("yyyy-mm-dd hh:mm");
  sheet.getRange("Q2:Q1000").setNumberFormat("yyyy-mm-dd hh:mm");

  addConditionalFormatting_(sheet);
}

function ensureOrdersSheetReady_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, ORDER_HEADERS.length);
  const currentHeaders = headerRange.getValues()[0].map((value) => String(value || "").trim());
  const hasExpectedHeaders = ORDER_HEADERS.every((header, index) => currentHeaders[index] === header);

  if (hasExpectedHeaders) {
    return;
  }

  headerRange.setValues([ORDER_HEADERS]);
  headerRange
    .setBackground("#2f6f4e")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet.setFrozenRows(1);
}

function setupDashboardSheet_(dashboardSheet, ordersSheet) {
  dashboardSheet.clear();
  dashboardSheet.clearFormats();

  dashboardSheet.getRange("A1").setValue("YummyYummy Daily Orders").setFontSize(18).setFontWeight("bold").setFontColor("#2f6f4e");
  dashboardSheet.getRange("A3").setValue("Total orders");
  dashboardSheet.getRange("B3").setFormula(`=COUNTA('${ordersSheet.getName()}'!B2:B)`);
  dashboardSheet.getRange("A4").setValue("Total revenue");
  dashboardSheet.getRange("B4").setFormula(`=SUM('${ordersSheet.getName()}'!K2:K)`);
  dashboardSheet.getRange("A5").setValue("Paid revenue");
  dashboardSheet.getRange("B5").setFormula(`=SUMIF('${ordersSheet.getName()}'!M2:M,"paid",'${ordersSheet.getName()}'!K2:K)`);
  dashboardSheet.getRange("A6").setValue("Unpaid orders");
  dashboardSheet.getRange("B6").setFormula(`=COUNTIF('${ordersSheet.getName()}'!M2:M,"unpaid")`);
  dashboardSheet.getRange("A7").setValue("Pending orders");
  dashboardSheet.getRange("B7").setFormula(`=COUNTIF('${ordersSheet.getName()}'!N2:N,"pending")`);

  dashboardSheet.getRange("A3:B7").setBackground("#f7fbf8").setBorder(true, true, true, true, true, true, "#d7e7dc", SpreadsheetApp.BorderStyle.SOLID);
  dashboardSheet.getRange("A3:A7").setFontWeight("bold");
  dashboardSheet.getRange("B4:B5").setNumberFormat("#,##0.00");
  dashboardSheet.setColumnWidths(1, 2, 180);
}

function addConditionalFormatting_(sheet) {
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("paid")
      .setBackground("#dcfce7")
      .setFontColor("#166534")
      .setRanges([sheet.getRange("M2:M1000")])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("unpaid")
      .setBackground("#fef3c7")
      .setFontColor("#92400e")
      .setRanges([sheet.getRange("M2:M1000")])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("cancelled")
      .setBackground("#fee2e2")
      .setFontColor("#991b1b")
      .setRanges([sheet.getRange("N2:N1000")])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("delivered")
      .setBackground("#e0f2fe")
      .setFontColor("#075985")
      .setRanges([sheet.getRange("N2:N1000")])
      .build(),
  ];

  sheet.setConditionalFormatRules(rules);
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function json_(data, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify({ ...data, statusCode }))
    .setMimeType(ContentService.MimeType.JSON);
}
