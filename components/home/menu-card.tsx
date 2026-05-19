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
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className="group bg-card rounded-3xl overflow-hidden border border-border hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="relative aspect-square overflow-hidden">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition duration-700"
        />
        {item.tag && (
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs ${
              item.tag === "bestseller"
                ? "bg-primary text-primary-foreground"
                : "bg-amber-400 text-white"
            }`}
          >
            {item.tag === "bestseller" ? "ขายดี" : "ใหม่"}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-heading text-lg leading-tight">{item.name}</h3>
        <p className="text-xs italic text-muted-foreground mt-0.5">{item.nameEn}</p>
        <p className="text-sm text-muted-foreground mt-3 min-h-10">{item.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-heading text-xl text-primary">฿{item.price}</span>
          <button
            onClick={() => onAddToCart(item)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground grid place-content-center hover:opacity-90"
            aria-label={`add-${item.id}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
