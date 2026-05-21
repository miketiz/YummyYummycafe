import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Menu, X, Plus, Wheat, Star, Clock, MapPin, Phone, Instagram, ChevronDown, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { CartSidebar, type CartItem } from '../components/CartSidebar';
import { ChatBot } from '../components/ChatBot';

type MenuItem = {
  id: number;
  name: string;
  nameEn: string;
  price: number;
  image: string;
  description: string;
  tag?: 'bestseller' | 'new';
};

const bakery: MenuItem[] = [
  { id: 1, name: 'ครัวซองต์เนยแท้', nameEn: 'Butter Croissant', price: 65, image: 'https://images.unsplash.com/photo-1623334044303-241021148842?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'ครัวซองต์อบสดทุกเช้า ชั้นแป้งกรอบนอกนุ่มใน เนยแท้ 100%', tag: 'bestseller' },
  { id: 2, name: 'ซินนามอน โรล', nameEn: 'Cinnamon Roll', price: 85, image: 'https://images.unsplash.com/photo-1694632288834-17d86b340745?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'ซินนามอนโรลอบร้อน หอมอบอวล ราดครีมชีสโฮมเมด', tag: 'bestseller' },
  { id: 3, name: 'ฟรุ๊ต ทาร์ต', nameEn: 'Fresh Fruit Tart', price: 95, image: 'https://images.unsplash.com/photo-1670819916757-e8d5935a6c65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'ทาร์ตหน้าผลไม้สดหลากชนิด ครีมคัสตาร์ดเนื้อเนียน', tag: 'new' },
  { id: 4, name: 'ซาวร์โดว์', nameEn: 'Sourdough Loaf', price: 180, image: 'https://images.unsplash.com/photo-1602077812176-1bd3ff433d74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'ซาวร์โดว์หมักธรรมชาติ 24 ชม. เปลือกกรอบ เนื้อเหนียวนุ่ม' },
  { id: 5, name: 'ดานิช พาสทรี', nameEn: 'Danish Pastry', price: 75, image: 'https://images.unsplash.com/photo-1777544575746-96654957db13?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'แป้งพัฟหลายชั้น หน้าผลไม้และครีม อบสดใหม่ทุกวัน', tag: 'new' },
  { id: 6, name: 'มัฟฟิน บลูเบอร์รี่', nameEn: 'Blueberry Muffin', price: 70, image: 'https://images.unsplash.com/photo-1722251172903-cc8774501df7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'มัฟฟินบลูเบอร์รี่อบนุ่ม เต็มไปด้วยผลไม้สดทุกคำ' },
  { id: 7, name: 'เอแคลร์ช็อกโกแลต', nameEn: 'Chocolate Éclair', price: 90, image: 'https://images.unsplash.com/photo-1774119657163-6a03af5f96d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'เอแคลร์แป้งชูซ์กรอบ ไส้ครีมช็อกโกแลตเข้มข้น', tag: 'new' },
  { id: 8, name: 'โฟกาชชาสมุนไพร', nameEn: 'Herb Focaccia', price: 120, image: 'https://images.unsplash.com/photo-1744988278657-5c1674813ade?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'โฟกาชชาอิตาเลียน โรสแมรี่ + โอลีฟออยล์แท้ หน้าหนา' },
  { id: 9, name: 'สโคนครีม', nameEn: 'Classic Cream Scone', price: 75, image: 'https://images.unsplash.com/photo-1777016844333-3641b8dc7f19?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'สโคนอังกฤษคลาสสิก เสิร์ฟพร้อมแยมและวิปครีม' },
  { id: 10, name: 'มาการองฝรั่งเศส', nameEn: 'French Macaron Set (3 pcs)', price: 110, image: 'https://images.unsplash.com/photo-1558326567-98ae2405596b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'มาการอง 3 ชิ้น คละ 3 รส เปลือกกรอบ ไส้ครีมนุ่ม', tag: 'new' },
];

const beverages: MenuItem[] = [
  { id: 11, name: 'มัทฉะลาเต้', nameEn: 'Matcha Latte', price: 85, image: 'https://images.unsplash.com/photo-1749280447307-31a68eb38673?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'มัทฉะเกรดพิเศษจากญี่ปุ่น ผสมนมโอ๊ตเนื้อครีมมี', tag: 'bestseller' },
  { id: 12, name: 'อเมริกาโน่เย็น', nameEn: 'Iced Americano', price: 70, image: 'https://images.unsplash.com/photo-1549652127-2e5e59e86a7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'เอสเปรสโซ่คั่วสด สกัดเย็น เข้มกลมกล่อม' },
  { id: 13, name: 'สตรอว์เบอร์รี่ลาเต้', nameEn: 'Strawberry Latte', price: 80, image: 'https://images.unsplash.com/photo-1686638745403-d21193f16b2f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=600', description: 'สตรอว์เบอร์รี่สด ผสมนมสด วิปครีมบนสุด', tag: 'new' },
];

const DAY_NAMES_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MONTH_NAMES_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const SPECIALS_SCHEDULE: Array<Array<{ id: number; pct: number; note: string }>> = [
  [{ id: 1, pct: 15, note: 'หอมกรุ่น!' }, { id: 6, pct: 10, note: 'แฮนด์เมด' }, { id: 10, pct: 20, note: 'ฝรั่งเศสแท้' }],
  [{ id: 2, pct: 10, note: 'อุ่นๆ เข้ากัน' }, { id: 7, pct: 15, note: 'ช็อกเข้ม!' }, { id: 9, pct: 12, note: 'สไตล์อังกฤษ' }],
  [{ id: 3, pct: 15, note: 'สดจากสวน' }, { id: 8, pct: 10, note: 'เมดิเตอร์' }, { id: 6, pct: 15, note: 'บลูเบอร์รี่สด' }],
  [{ id: 4, pct: 10, note: 'หมักแท้ 24ชม.' }, { id: 1, pct: 20, note: 'เช้านี้อบ!' }, { id: 7, pct: 15, note: 'ช็อกเข้ม' }],
  [{ id: 5, pct: 15, note: 'หลายชั้น' }, { id: 3, pct: 10, note: 'ผลไม้สด' }, { id: 2, pct: 12, note: 'อร่อยมาก!' }],
  [{ id: 6, pct: 10, note: 'บลูเบอร์รี่สด' }, { id: 10, pct: 15, note: 'สีสวย!' }, { id: 8, pct: 20, note: 'สมุนไพรสด' }],
  [{ id: 9, pct: 15, note: 'วีคเอนด์สเปเชียล' }, { id: 4, pct: 10, note: '24ชม.' }, { id: 5, pct: 10, note: 'กรอบนุ่ม' }],
];

const features = [
  { icon: Flame, title: 'อบสดทุกเช้า', desc: 'ออกจากเตาตั้งแต่ 6 โมงเช้า' },
  { icon: Wheat, title: 'ส่วนผสมธรรมชาติ', desc: 'ไม่มีสารกันบูด' },
  { icon: Star, title: 'สูตรคราฟท์แท้', desc: 'พัฒนาสูตรมา 5 ปี' },
  { icon: Clock, title: 'เปิดทุกวัน', desc: '7:00 – 19:00 น.' },
];

export default function Home() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`เพิ่ม "${item.name}" ลงตะกร้าแล้ว!`, { description: `฿${item.price}`, duration: 2000 });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: c.quantity + delta } : c)).filter((c) => c.quantity > 0));
  };

  const removeItem = (id: number) => setCart((prev) => prev.filter((c) => c.id !== id));
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="bottom-right" richColors />

      {/* NAVBAR */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${scrolled ? 'bg-card/95 backdrop-blur-lg shadow-lg shadow-black/5 border-b border-border' : 'bg-gradient-to-b from-black/30 to-transparent backdrop-blur-[2px]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${scrolled ? 'bg-primary shadow-primary/25' : 'bg-primary/90 shadow-primary/20'}`}>
                <Wheat className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
              </div>
              <div className="flex flex-col leading-none">
                <span className={`transition-colors duration-300 ${scrolled ? 'text-foreground' : 'text-white'}`} style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>YummyYummy</span>
                <span className="transition-colors duration-300" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.72rem', fontStyle: 'italic', fontWeight: 400, letterSpacing: '0.18em', color: scrolled ? 'var(--primary)' : 'rgba(168,213,186,0.95)', marginTop: '1px' }}>Artisan Bakery</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {[{ label: 'เบเกอรี่', id: 'bakery' }, { label: 'เครื่องดื่ม', id: 'beverages' }, { label: 'เกี่ยวกับเรา', id: 'about' }].map((link) => (
                <button key={link.id} onClick={() => scrollTo(link.id)} className={`px-4 py-2 rounded-full transition-all duration-200 ${scrolled ? 'text-foreground/70 hover:text-foreground hover:bg-primary/10' : 'text-white/80 hover:text-white hover:bg-white/15'}`} style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.9rem' }}>
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button onClick={() => setCartOpen(true)} className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 ${scrolled ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/30' : 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'}`}>
                <ShoppingCart className="w-4 h-4" strokeWidth={2} />
                <span className="text-sm hidden sm:block" style={{ fontWeight: 500 }}>ตะกร้า</span>
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={`min-w-[20px] h-5 px-1 rounded-full text-xs flex items-center justify-center font-bold ${scrolled ? 'bg-white text-primary' : 'bg-primary text-primary-foreground'}`}>
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`md:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${scrolled ? 'text-foreground hover:bg-muted' : 'text-white hover:bg-white/20'}`}>
                <AnimatePresence mode="wait">
                  {mobileMenuOpen ? (
                    <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5" /></motion.div>
                  ) : (
                    <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="w-5 h-5" /></motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="md:hidden mx-4 mb-3 bg-card rounded-2xl border border-border shadow-xl shadow-black/10 overflow-hidden">
              <nav className="flex flex-col p-2">
                {[{ label: '🥐  เบเกอรี่', id: 'bakery' }, { label: '☕  เครื่องดื่ม', id: 'beverages' }, { label: '🌿  เกี่ยวกับเรา', id: 'about' }].map((link, i) => (
                  <div key={link.id}>
                    <button onClick={() => scrollTo(link.id)} className="w-full text-left px-4 py-3.5 text-foreground hover:bg-muted rounded-xl transition-colors" style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.95rem' }}>{link.label}</button>
                    {i < 2 && <div className="mx-4 h-px bg-border" />}
                  </div>
                ))}
              </nav>
              <div className="px-4 pb-4">
                <button onClick={() => { setCartOpen(true); setMobileMenuOpen(false); }} className="w-full py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2" style={{ fontWeight: 500 }}>
                  <ShoppingCart className="w-4 h-4" />ดูตะกร้าสินค้า {totalItems > 0 && `(${totalItems})`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* HERO */}
      <section className="relative h-screen min-h-[640px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1759459981049-1a658da71c33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920" alt="YummyYummy Bakery" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-background" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
            <motion.p initial={{ opacity: 0, letterSpacing: '0.1em' }} animate={{ opacity: 1, letterSpacing: '0.3em' }} transition={{ duration: 1, delay: 0.2 }} className="text-primary text-xs uppercase mb-5 tracking-[0.3em]">Freshly Baked Every Morning</motion.p>
            <h1 className="text-white mb-5" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(3rem, 9vw, 6.5rem)', fontWeight: 600, lineHeight: 1.1 }}>
              YummyYummy<br /><span className="italic text-primary" style={{ fontWeight: 400 }}>Bakery</span>
            </h1>
            <p className="text-white/75 mb-10 max-w-lg mx-auto" style={{ fontSize: '1.1rem', lineHeight: 1.7 }}>เบเกอรี่คราฟท์อบสดทุกเช้า จากส่วนผสมธรรมชาติ<br />ไม่มีสารกันบูด ทำด้วยใจทุกชิ้น</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => scrollTo('bakery')} className="px-8 py-3.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5">สั่งเลย</button>
              <button onClick={() => scrollTo('beverages')} className="px-8 py-3.5 bg-white/15 backdrop-blur-sm text-white border border-white/30 rounded-full hover:bg-white/25 transition-all">ดูเมนู</button>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}><ChevronDown className="w-6 h-6 text-white/50" /></motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-14 px-4 bg-card border-y border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }} className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center"><f.icon className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-foreground" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{f.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DAILY SPECIAL */}
      <DailySpecialSection allItems={bakery} onAddToCart={addToCart} />

      {/* BAKERY */}
      <section id="bakery" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <SectionHeader en="Fresh from the oven" th="เบเกอรี่สด" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bakery.map((item, i) => <MenuCard key={item.id} item={item} index={i} onAddToCart={addToCart} />)}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="py-16 px-4 bg-primary/10 border-y border-primary/20">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
          <p className="text-foreground mb-2" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontStyle: 'italic' }}>"ทุกชิ้นอบด้วยความรัก ส่งตรงจากเตาถึงมือคุณ"</p>
          <p className="text-muted-foreground text-sm">— YummyYummy Bakery —</p>
        </motion.div>
      </section>

      {/* BEVERAGES */}
      <section id="beverages" className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/10">
        <div className="max-w-7xl mx-auto">
          <SectionHeader en="Drinks" th="เครื่องดื่ม" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {beverages.map((item, i) => <MenuCard key={item.id} item={item} index={i} onAddToCart={addToCart} />)}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative">
              <div className="rounded-3xl overflow-hidden aspect-[4/3]">
                <img src="https://images.unsplash.com/photo-1536782896453-61d09f3aaf3e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800" alt="YummyYummy Bakery" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-5 -right-5 w-28 h-28 rounded-2xl bg-primary flex flex-col items-center justify-center text-primary-foreground shadow-xl">
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 }}>5+</span>
                <span className="text-xs mt-1 text-center px-2">ปีแห่งรสชาติ</span>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="space-y-6">
              <div>
                <p className="text-primary text-xs tracking-[0.25em] uppercase mb-3">Our Story</p>
                <h2 className="text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', lineHeight: 1.2 }}>เรื่องราวของ<br />YummyYummy Bakery</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">YummyYummy Bakery เกิดจากความหลงใหลในศาสตร์แห่งการอบขนม เราคัดสรรวัตถุดิบธรรมชาติคุณภาพสูง ปราศจากสารกันบูดและสีสังเคราะห์ อบสดใหม่ทุกเช้าตั้งแต่ 6 โมง</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                  { icon: Clock, label: 'เปิดทำการ', lines: ['จันทร์ – อาทิตย์', '7:00 – 19:00 น.'] },
                  { icon: MapPin, label: 'ที่อยู่', lines: ['ถ.สุขุมวิท ซอย 11', 'กรุงเทพมหานคร'] },
                  { icon: Phone, label: 'ติดต่อ', lines: ['0634365174', 'Line: @yummybakery'] },
                  { icon: Instagram, label: 'โซเชียล', lines: ['@yummyyummy.bakery', 'Facebook: YummyYummy'] },
                ].map(({ icon: Icon, label, lines }) => (
                  <div key={label} className="flex items-start gap-3 p-4 bg-muted rounded-2xl">
                    <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      {lines.map((l) => <p key={l} className="text-foreground">{l}</p>)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 px-4 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"><Wheat className="w-4 h-4 text-primary-foreground" /></div>
            <span className="text-foreground" style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>YummyYummy Bakery</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 YummyYummy Bakery. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {[{ label: 'เบเกอรี่', id: 'bakery' }, { label: 'เครื่องดื่ม', id: 'beverages' }, { label: 'เกี่ยวกับเรา', id: 'about' }].map((link) => (
              <button key={link.id} onClick={() => scrollTo(link.id)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</button>
            ))}
            <Link to="/admin" className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">Admin</Link>
          </div>
        </div>
      </footer>

      <CartSidebar open={cartOpen} onOpenChange={setCartOpen} cart={cart} onUpdateQuantity={updateQuantity} onRemove={removeItem} />
      <ChatBot />

      <AnimatePresence>
        {totalItems > 0 && !cartOpen && (
          <motion.button initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} onClick={() => setCartOpen(true)} className="fixed bottom-6 right-6 md:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center z-40">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">{totalItems}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionHeader({ en, th }: { en: string; th: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
      <p className="text-primary text-xs tracking-[0.25em] uppercase mb-3">{en}</p>
      <h2 className="text-foreground mb-4" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>{th}</h2>
      <div className="w-12 h-0.5 bg-primary mx-auto rounded-full" />
    </motion.div>
  );
}

function DailySpecialSection({ allItems, onAddToCart }: { allItems: MenuItem[]; onAddToCart: (item: MenuItem) => void }) {
  const today = new Date();
  const dayIdx = today.getDay();
  const specials = SPECIALS_SCHEDULE[dayIdx].map((s) => {
    const item = allItems.find((b) => b.id === s.id)!;
    return { ...item, discountPct: s.pct, specialPrice: Math.floor(item.price * (1 - s.pct / 100)), note: s.note };
  });
  const dateStr = `วัน${DAY_NAMES_TH[dayIdx]}ที่ ${today.getDate()} ${MONTH_NAMES_TH[today.getMonth()]} ${today.getFullYear() + 543}`;

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-amber-50 border-y border-amber-200/60">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔥</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-white tracking-wide">TODAY ONLY • วันนี้เท่านั้น!</span>
            </div>
            <h2 className="text-foreground mb-1" style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>เมนูพิเศษประจำวัน</h2>
            <p className="text-muted-foreground text-sm">{dateStr} — ราคาพิเศษ หมดแล้วหมดเลย!</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-2xl px-4 py-3 self-start sm:self-auto">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div><p className="text-xs text-muted-foreground leading-none mb-0.5">หมดเขต</p><p className="text-sm font-semibold text-foreground">19:00 น. วันนี้</p></div>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {specials.map((item, index) => (
            <motion.div key={`special-${item.id}`} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45, delay: index * 0.1 }} className="group relative bg-white rounded-3xl overflow-hidden border-2 border-amber-300 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-200/50 transition-all duration-300 hover:-translate-y-1">
              <div className="absolute top-0 right-0 z-10">
                <div className="bg-amber-400 text-white px-3 py-1.5 rounded-bl-2xl rounded-tr-3xl">
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>-{item.discountPct}%</span>
                </div>
              </div>
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  <span className="text-xs text-amber-600 font-semibold">{item.note}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 600 }}>{item.name}</h3>
                <p className="text-xs text-muted-foreground italic mb-3">{item.nameEn}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground line-through text-sm">฿{item.price}</p>
                    <p className="text-amber-600" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>฿{item.specialPrice}</p>
                  </div>
                  <button onClick={() => onAddToCart({ ...item, price: item.specialPrice })} className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-400 text-white hover:bg-amber-500 transition-all hover:scale-105 shadow-md shadow-amber-300/40" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    <Plus className="w-3.5 h-3.5" />เพิ่ม
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MenuCard({ item, index, onAddToCart }: { item: MenuItem; index: number; onAddToCart: (item: MenuItem) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.08 }} className="group bg-card rounded-3xl overflow-hidden border border-border hover:shadow-xl hover:shadow-primary/10 transition-all duration-400 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        {item.tag && (
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs ${item.tag === 'bestseller' ? 'bg-primary text-primary-foreground' : 'bg-amber-400 text-white'}`}>
            {item.tag === 'bestseller' ? '⭐ ขายดี' : '✨ ใหม่'}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-foreground mb-0.5" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 600 }}>{item.name}</h3>
        <p className="text-xs text-muted-foreground mb-2 italic">{item.nameEn}</p>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{item.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-primary" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 600 }}>฿{item.price}</span>
          <button onClick={() => onAddToCart(item)} className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 hover:scale-110 transition-all duration-200 shadow-md shadow-primary/30">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
