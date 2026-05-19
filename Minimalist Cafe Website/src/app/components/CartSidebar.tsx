import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from './ui/sheet';
import { Button } from './ui/button';

export type CartItem = {
  id: number;
  name: string;
  nameEn: string;
  price: number;
  image: string;
  quantity: number;
};

type CartSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onUpdateQuantity: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
};

export function CartSidebar({ open, onOpenChange, cart, onUpdateQuantity, onRemove }: CartSidebarProps) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-md bg-background">
        <SheetHeader className="border-b border-border pb-4 px-6 pt-6">
          <SheetTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <ShoppingBag className="w-5 h-5 text-primary" />
            ตะกร้าสินค้า
            {totalItems > 0 && (
              <span className="ml-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                ตะกร้าว่างเปล่า
              </p>
              <p className="text-sm text-muted-foreground mt-1">เพิ่มสินค้าที่คุณชื่นชอบได้เลย</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl border border-border/50"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate" style={{ fontFamily: 'var(--font-heading)' }}>
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.nameEn}</p>
                  <p className="text-primary mt-0.5">฿{item.price}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors ml-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <SheetFooter className="border-t border-border px-6 pt-4 pb-6">
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">รวมทั้งหมด</span>
                <span className="text-2xl text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  ฿{total.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {total >= 500 ? '🎉 ได้รับสิทธิ์จัดส่งฟรี!' : `จัดส่งฟรีเมื่อซื้อครบ ฿500 (อีก ฿${500 - total})`}
                </span>
              </div>
              <Button
                className="w-full rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity h-12"
                size="lg"
              >
                สั่งซื้อเลย
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
