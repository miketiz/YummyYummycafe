import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Sparkles, ChevronDown } from 'lucide-react';

type Message = {
  id: number;
  role: 'user' | 'bot';
  text: string;
};

const QUICK_REPLIES = ['เมนูพิเศษวันนี้?', 'แนะนำเบเกอรี่หน่อย', 'มีเมนูอะไรบ้าง?', 'ราคาเท่าไร?'];

const menuData = {
  bakery: [
    { name: 'ครัวซองต์เนยแท้', nameEn: 'Butter Croissant', price: 65, tag: 'bestseller', desc: 'อบสดทุกเช้า ชั้นแป้งกรอบนอกนุ่มใน เนยแท้ 100%' },
    { name: 'ซินนามอน โรล', nameEn: 'Cinnamon Roll', price: 85, tag: 'bestseller', desc: 'หอมอบอวล ราดครีมชีสโฮมเมด' },
    { name: 'ฟรุ๊ต ทาร์ต', nameEn: 'Fresh Fruit Tart', price: 95, tag: 'new', desc: 'ผลไม้สดหลากชนิด ครีมคัสตาร์ดเนื้อเนียน' },
    { name: 'ซาวร์โดว์', nameEn: 'Sourdough Loaf', price: 180, desc: 'หมักธรรมชาติ 24 ชม. เปลือกกรอบ เนื้อเหนียวนุ่ม' },
    { name: 'ดานิช พาสทรี', nameEn: 'Danish Pastry', price: 75, tag: 'new', desc: 'แป้งพัฟหลายชั้น หน้าผลไม้และครีม' },
    { name: 'มัฟฟิน บลูเบอร์รี่', nameEn: 'Blueberry Muffin', price: 70, desc: 'เต็มไปด้วยบลูเบอร์รี่สดทุกคำ' },
    { name: 'เอแคลร์ช็อกโกแลต', nameEn: 'Chocolate Éclair', price: 90, tag: 'new', desc: 'แป้งชูซ์กรอบ ไส้ครีมช็อกโกแลตเข้มข้น' },
    { name: 'โฟกาชชาสมุนไพร', nameEn: 'Herb Focaccia', price: 120, desc: 'อิตาเลียน โรสแมรี่ + โอลีฟออยล์แท้ หน้าหนา' },
    { name: 'สโคนครีม', nameEn: 'Classic Cream Scone', price: 75, desc: 'สโคนอังกฤษคลาสสิก เสิร์ฟพร้อมแยมและวิปครีม' },
    { name: 'มาการองฝรั่งเศส (3 ชิ้น)', nameEn: 'French Macaron Set', price: 110, tag: 'new', desc: 'คละ 3 รส เปลือกกรอบ ไส้ครีมนุ่ม' },
  ],
  beverages: [
    { name: 'มัทฉะลาเต้', nameEn: 'Matcha Latte', price: 85, tag: 'bestseller', desc: 'มัทฉะเกรดพิเศษจากญี่ปุ่น ผสมนมโอ๊ตครีมมี' },
    { name: 'อเมริกาโน่เย็น', nameEn: 'Iced Americano', price: 70, desc: 'เอสเปรสโซ่คั่วสด สกัดเย็น เข้มกลมกล่อม' },
    { name: 'สตรอว์เบอร์รี่ลาเต้', nameEn: 'Strawberry Latte', price: 80, tag: 'new', desc: 'สตรอว์เบอร์รี่สด ผสมนมสด วิปครีมบนสุด' },
  ],
};

function getBotResponse(input: string, history: Message[]): string {
  const lower = input.toLowerCase().trim();
  const isFirst = history.filter((m) => m.role === 'bot').length === 0;

  if (isFirst) {
    return 'สวัสดีค่ะ! ฉันชื่อ Yummy 🥐 แชทบอทประจำ YummyYummy Bakery\nถามเรื่องเบเกอรี่ ราคา เวลาเปิด หรือขอแนะนำเมนูได้เลยนะคะ 😊';
  }

  if (/สวัสดี|หวัดดี|hello|hi|ดีจ้า|ดีครับ|ดีค่ะ/.test(lower)) {
    return 'สวัสดีค่ะ! 😊 มีอะไรให้ช่วยไหมคะ? ถามเรื่องเบเกอรี่ได้เลยนะคะ 🥐';
  }

  if (/ขอบคุณ|thank|ขอบใจ|โอเค|ok|ได้เลย/.test(lower)) {
    return 'ยินดีมากเลยค่ะ! 💚 มีอะไรอยากรู้เพิ่มเติมอีกไหมคะ?';
  }

  if (/เมนู|มีอะไร|ขาย|list/.test(lower)) {
    const bList = menuData.bakery.map((b) => `• ${b.name} ฿${b.price}${b.tag === 'bestseller' ? ' ⭐' : b.tag === 'new' ? ' ✨' : ''}`).join('\n');
    const dList = menuData.beverages.map((d) => `• ${d.name} ฿${d.price}${d.tag === 'bestseller' ? ' ⭐' : d.tag === 'new' ? ' ✨' : ''}`).join('\n');
    return `เมนูทั้งหมดของเราค่ะ 😋\n\n🥐 เบเกอรี่สด\n${bList}\n\n☕ เครื่องดื่ม\n${dList}\n\n⭐ = ขายดี  ✨ = เมนูใหม่\nอบสดทุกเช้าเลยค่ะ!`;
  }

  if (/ราคา|เท่าไร|บาท|ถูก|แพง|cost|price/.test(lower)) {
    const bPrices = menuData.bakery.map((b) => `• ${b.name}: ฿${b.price}`).join('\n');
    const dPrices = menuData.beverages.map((d) => `• ${d.name}: ฿${d.price}`).join('\n');
    return `ราคาทั้งหมดค่ะ 🏷️\n\n🥐 เบเกอรี่\n${bPrices}\n\n☕ เครื่องดื่ม\n${dPrices}\n\nจัดส่งฟรีเมื่อซื้อครบ ฿500 นะคะ! 🚗`;
  }

  if (/ครัวซองต์|croissant/.test(lower)) {
    return 'ครัวซองต์เนยแท้ ฿65 ค่ะ ⭐ ขายดีที่สุด!\n\nอบสดทุกเช้าตั้งแต่ 6 โมง ชั้นแป้งกรอบนอกนุ่มใน ใช้เนยแท้ 100% นำเข้าจากฝรั่งเศส\n\nหมดเร็วมากค่ะ แนะนำมารับก่อน 10 โมงเช้านะคะ! 🥐';
  }

  if (/ซินนามอน|cinnamon|โรล|roll/.test(lower)) {
    return 'ซินนามอน โรล ฿85 ค่ะ ⭐ ขายดีมาก!\n\nอบร้อน หอมอบอวลทั้งร้าน ราดครีมชีสโฮมเมดสูตรพิเศษ\n\nเสิร์ฟอุ่นๆ กินกับกาแฟร้อนอร่อยมากค่ะ ☕🌀';
  }

  if (/ทาร์ต|tart|ฟรุ๊ต/.test(lower)) {
    return 'ฟรุ๊ต ทาร์ต ฿95 ค่ะ ✨ เมนูใหม่!\n\nแป้งทาร์ตกรอบ ครีมคัสตาร์ดเนื้อเนียน ตกแต่งด้วยผลไม้สดหลากชนิดสวยมาก\n\nถ่ายรูปลงโซเชียลได้เลยค่ะ 📸💚';
  }

  if (/ซาวร์โดว์|sourdough/.test(lower)) {
    return 'ซาวร์โดว์ ฿180 ค่ะ 🍞\n\nขนมปังหมักธรรมชาติ 24 ชั่วโมง ไม่ใส่สารกันบูด เปลือกกรอบ เนื้อเหนียวนุ่ม\n\nเหมาะสำหรับทานเป็นมื้อเช้า หรือซื้อกลับบ้านค่ะ อร่อยมากทั้งแบบเปล่าและทาเนย!';
  }

  if (/ดานิช|danish|พาสทรี|pastry/.test(lower)) {
    return 'ดานิช พาสทรี ฿75 ค่ะ ✨ เมนูใหม่!\n\nแป้งพัฟหลายชั้นบางเบา หน้าผลไม้และครีม อบสดทุกวัน\n\nมีหลายหน้าให้เลือกค่ะ ขึ้นอยู่กับวันนั้นๆ แนะนำมาดูที่ร้านเลยนะคะ!';
  }

  if (/มัฟฟิน|muffin|บลูเบอร์รี่|blueberry/.test(lower)) {
    return 'มัฟฟิน บลูเบอร์รี่ ฿70 ค่ะ 🫐\n\nมัฟฟินเนื้อนุ่ม เต็มไปด้วยบลูเบอร์รี่สดทุกคำ ไม่หวานจัด\n\nทานเป็นอาหารเช้าได้เลยค่ะ เป็นเมนูที่สุขภาพดีที่สุดของเราค่ะ 😊';
  }

  if (/เอแคลร์|eclair|éclair|ช็อกโกแลต|chocolate/.test(lower)) {
    return 'เอแคลร์ช็อกโกแลต ฿90 ค่ะ ✨ เมนูใหม่!\n\nแป้งชูซ์กรอบนอกนุ่มใน ไส้ครีมช็อกโกแลตเข้มข้น หอมกลิ่นโกโก้แท้\n\nสายช็อกโกแลตห้ามพลาดเลยค่ะ! 🍫';
  }

  if (/โฟกาชชา|focaccia/.test(lower)) {
    return 'โฟกาชชาสมุนไพร ฿120 ค่ะ 🌿\n\nขนมปังอิตาเลียนหน้าหนา โรสแมรี่สดและโอลีฟออยล์แท้นำเข้า\nเนื้อนุ่มด้านใน กรอบด้านนอก หอมมากค่ะ\n\nเหมาะสำหรับทานเป็นมื้อเที่ยงหรือแชร์เพื่อน 😋';
  }

  if (/สโคน|scone/.test(lower)) {
    return 'สโคนครีม ฿75 ค่ะ 🫖\n\nสโคนสไตล์อังกฤษคลาสสิก เสิร์ฟพร้อมแยมผลไม้และวิปครีม\nร่วนนุ่ม หอมเนย เหมาะกับชาร้อนมากค่ะ\n\nสั่งคู่กับมัทฉะลาเต้อร่อยมากนะคะ! 🍵';
  }

  if (/มาการอง|macaron/.test(lower)) {
    return 'มาการองฝรั่งเศส ฿110 ค่ะ ✨ เมนูใหม่!\n\nเซต 3 ชิ้น คละ 3 รสชาติ เปลือกกรอบเบาบาง ไส้ครีมกานาชนุ่ม\nสีสันสวย ถ่ายรูปสวยมากค่ะ 🩷\n\nเหมาะเป็นของฝากหรือกินเองก็อร่อยค่ะ!';
  }

  if (/พิเศษ|special|วันนี้|today|ลด|ส่วนลด|discount/.test(lower)) {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const day = days[new Date().getDay()];
    return `เมนูพิเศษวัน${day}นี้ค่ะ! 🔥\n\nเรามีเมนูพิเศษรายวัน 3 รายการที่ลดราคาพิเศษ\nดูได้ที่ section "เมนูพิเศษประจำวัน" บนหน้าเว็บเลยค่ะ\n\n⏰ หมดเขต 19:00 น. วันนี้เท่านั้น!\nรีบสั่งก่อนหมดนะคะ 😊`;
  }

  if (/มัทฉะ|matcha|ชาเขียว/.test(lower)) {
    return 'มัทฉะลาเต้ ฿85 ค่ะ ⭐ ขายดี!\n\nมัทฉะเกรดพิเศษจากญี่ปุ่น ผสมนมโอ๊ตเนื้อครีมมี\n\nเข้ากับครัวซองต์หรือซินนามอนโรลได้ดีมากค่ะ 💚🥐';
  }

  if (/กาแฟ|coffee|อเมริกาโน่|americano/.test(lower)) {
    return 'อเมริกาโน่เย็น ฿70 ค่ะ ☕\n\nเอสเปรสโซ่จากเมล็ดกาแฟคั่วสด เข้มกลมกล่อม\n\nถ้าชอบเข้มแนะนำคู่กับครัวซองต์เนยแท้เลยค่ะ อร่อยมาก!';
  }

  if (/สตรอว์|strawberry/.test(lower)) {
    return 'สตรอว์เบอร์รี่ลาเต้ ฿80 ค่ะ ✨ เมนูใหม่!\n\nสตรอว์เบอร์รี่สด ผสมนมสด มีวิปครีมบนสุดน่ารักมาก\n\nเข้ากันได้ดีกับฟรุ๊ต ทาร์ตค่ะ ลองสั่งคู่กันดูนะคะ! 🍓';
  }

  if (/เปิด|ปิด|กี่โมง|เวลา|วัน|hour|time/.test(lower)) {
    return '⏰ เวลาเปิด-ปิดค่ะ\n\nจันทร์ – อาทิตย์\n7:00 – 19:00 น.\n\nเบเกอรี่เริ่มออกจากเตาตั้งแต่ 6 โมงเช้า ค่ะ\nแนะนำมาตั้งแต่เช้าเพื่อเลือกได้หลากหลายนะคะ 🌅';
  }

  if (/ที่ไหน|อยู่|ที่อยู่|สถานที่|ซอย|ถนน|location|where|map/.test(lower)) {
    return '📍 ที่อยู่ร้านค่ะ\n\nถนนสุขุมวิท ซอย 11\nกรุงเทพมหานคร\n\nค้นหาใน Google Maps\nชื่อ "YummyYummy Bakery" ได้เลยค่ะ 🗺️';
  }

  if (/ติดต่อ|โทร|เบอร์|line|ไลน์|ig|instagram|facebook|social/.test(lower)) {
    return '📱 ช่องทางติดต่อค่ะ\n\n• โทร: 0634365174\n• Line OA: @yummybakery\n• Instagram: @yummyyummy.bakery\n• Facebook: YummyYummy Bakery\n\nยินดีตอบทุกคำถามค่ะ 💚';
  }

  if (/ส่ง|delivery|จัดส่ง|ออนไลน์|สั่ง/.test(lower)) {
    return '🚗 บริการจัดส่งค่ะ!\n\n• จัดส่งฟรีเมื่อซื้อครบ ฿500\n• สั่งผ่านเว็บไซต์นี้ได้เลย\n• โทรสั่งล่วงหน้าได้ที่ 0634365174\n\n⚠️ เบเกอรี่อบสดใหม่ แนะนำรับที่ร้านจะอร่อยสุดค่ะ!';
  }

  if (/สด|fresh|อบ|สุขภาพ|ธรรมชาติ|สาร|กันบูด/.test(lower)) {
    return 'เราใส่ใจทุกส่วนผสมค่ะ! 🌿\n\n✅ ไม่มีสารกันบูด\n✅ ไม่ใช้สีสังเคราะห์\n✅ วัตถุดิบธรรมชาติ 100%\n✅ อบสดทุกเช้าเริ่ม 6.00 น.\n✅ หมักแป้งด้วยธรรมชาติ\n\nของที่ค้างจากเมื่อวานเราไม่ขายค่ะ 😊';
  }

  if (/แนะนำ|อะไรดี|ลอง|เริ่ม|ชอบ|recommend|best|ดีที่สุด|combo|เซ็ต/.test(lower)) {
    return 'แนะนำ combo ยอดนิยมของเราค่ะ! ⭐\n\n🥐 Classic Morning Set\n• ครัวซองต์เนยแท้ ฿65\n• อเมริกาโน่เย็น ฿70\n→ รวม ฿135 อาหารเช้าสุดคลาสสิก!\n\n🌀 Sweet Morning Set\n• ซินนามอน โรล ฿85\n• มัทฉะลาเต้ ฿85\n→ รวม ฿170 หวานหอมเข้ากันดีมาก!\n\n🍓 New Lover Set\n• ฟรุ๊ต ทาร์ต ฿95 ✨\n• สตรอว์เบอร์รี่ลาเต้ ฿80 ✨\n→ รวม ฿175 เมนูใหม่มาแรง!';
  }

  if (/คุณ|bot|ai|robot|ใคร|who are you/.test(lower)) {
    return 'ฉันชื่อ Yummy ค่ะ 🤖🥐\nแชทบอท AI ประจำ YummyYummy Bakery\nช่วยตอบเรื่องเบเกอรี่ ราคา เวลา ที่อยู่ และแนะนำเมนูได้ค่ะ!\n\nมีอะไรให้ช่วยไหมคะ? 😊';
  }

  return 'ขอโทษค่ะ ไม่แน่ใจว่าเข้าใจถูกต้องไหม 😅\nลองถามเรื่องเหล่านี้ได้เลยค่ะ:\n\n🥐 เมนูเบเกอรี่และราคา\n☕ เครื่องดื่ม\n⏰ เวลาเปิด-ปิด\n📍 ที่อยู่ร้าน\n🚗 การจัดส่ง\n⭐ ขอแนะนำ combo';
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (open && messages.length === 0) {
      sendBotMessage('สวัสดีค่ะ! ฉันชื่อ Yummy 🥐 แชทบอทประจำ YummyYummy Bakery\nถามเรื่องเบเกอรี่ ราคา เวลาเปิด หรือขอแนะนำเมนูได้เลยนะคะ 😊');
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendBotMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'bot', text }]);
  };

  const handleSend = (text?: string) => {
    const msgText = (text ?? input).trim();
    if (!msgText) return;
    setInput('');
    setShowQuickReplies(false);
    const userMsg: Message = { id: nextId.current++, role: 'user', text: msgText };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        sendBotMessage(getBotResponse(msgText, next));
      }, 700 + Math.random() * 600);
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-[360px] z-50 flex flex-col bg-card rounded-3xl shadow-2xl shadow-black/20 border border-border overflow-hidden"
            style={{ maxHeight: 'min(520px, calc(100vh - 120px))' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-primary/10 border-b border-border flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem' }}>
                  Yummy AI
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">ออนไลน์</span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors flex-shrink-0">
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role === 'bot' && (
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mb-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`px-4 py-2.5 rounded-2xl max-w-[80%] whitespace-pre-line leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                    style={{ fontSize: '0.875rem' }}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-end gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="px-4 py-3 bg-muted rounded-2xl rounded-bl-md flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showQuickReplies && messages.length <= 1 && !isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap gap-2 pt-1"
                  >
                    {QUICK_REPLIES.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSend(q)}
                        className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/20 transition-colors"
                        style={{ fontSize: '0.8rem' }}
                      >
                        {q}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border flex-shrink-0">
              <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="พิมพ์ข้อความ..."
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground min-w-0"
                  style={{ fontSize: '0.875rem' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2 opacity-60">Powered by YummyYummy AI 🥐</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-primary"
            animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    </>
  );
}
