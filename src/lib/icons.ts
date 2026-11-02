import type { LucideIcon } from 'lucide-react'
import {
  Tag,
  Utensils,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  Receipt,
  Briefcase,
  Laptop,
  TrendingUp,
  Coins,
  Plane,
  Gift,
  Wrench,
  Phone,
  ShieldCheck,
  Sparkles,
  Dumbbell,
  Landmark,
  Wallet,
  PiggyBank,
  Banknote,
  Vault,
} from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  Tag,
  Utensils,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  ShoppingBag,
  Receipt,
  Briefcase,
  Laptop,
  TrendingUp,
  Coins,
  Plane,
  Gift,
  Wrench,
  Phone,
  ShieldCheck,
  Sparkles,
  Dumbbell,
  Landmark,
  Wallet,
  PiggyBank,
  Banknote,
  Vault,
}

export function getCategoryIcon(name?: string | null): LucideIcon {
  if (!name || !ICON_MAP[name]) return Tag
  return ICON_MAP[name]
}

