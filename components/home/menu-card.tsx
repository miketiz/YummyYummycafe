"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import type { MenuItem } from "./menu-data";

type MenuCardProps = {
  item: MenuItem;
  index: number;
  onAddToCart: (item: MenuItem) => void;
};

export function MenuCard({ item, index, onAddToCart }: MenuCardProps) {
  const isLikelyAboveFold = index < 6;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="group bg-card rounded-lg overflow-hidden border border-border shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          loading={isLikelyAboveFold ? "eager" : "lazy"}
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent opacity-80" />
        {item.tag && (
          <span
            className={`absolute top-3 left-3 rounded px-2.5 py-1 text-xs font-medium shadow-sm ${
              item.tag === "bestseller"
                ? "bg-primary text-primary-foreground"
                : "bg-amber-400 text-white"
            }`}
          >
            {item.tag === "bestseller" ? "ขายดี" : "ใหม่"}
          </span>
        )}
        <span className="absolute bottom-3 right-3 rounded bg-card/95 px-3 py-1.5 font-heading text-lg text-primary shadow-sm">
          ฿{item.price}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg leading-tight">{item.name}</h3>
            <p className="mt-0.5 text-xs italic text-muted-foreground">{item.nameEn}</p>
          </div>
          <span className="shrink-0 text-xl" aria-hidden="true">
            {item.emoji}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-3 min-h-10">{item.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">อบสด / พร้อมเสิร์ฟ</span>
          <button
            onClick={() => onAddToCart(item)}
            className="grid h-10 w-10 place-content-center rounded bg-primary text-primary-foreground transition hover:opacity-90"
            aria-label={`add-${item.id}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
