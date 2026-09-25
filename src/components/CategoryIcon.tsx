import React from 'react';
import {
  Home,
  Utensils,
  Car,
  HeartPulse,
  Coffee,
  GraduationCap,
  ShoppingBag,
  Tv,
  MoreHorizontal,
  Briefcase,
  Sparkles,
  TrendingUp,
  Wallet,
  CreditCard,
  Barcode,
  Banknote,
  ArrowRightLeft,
  Zap,
  HelpCircle,
  PawPrint,
  Tag,
  Gift,
  Plane,
  Baby,
  Dumbbell,
  BookOpen,
  Music,
  Film,
  Scissors,
  Wrench,
  Shield,
  Smartphone,
  Smile,
  Store,
  PiggyBank,
  Heart,
  Star,
  Fuel,
  Laptop,
  LucideProps
} from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  name: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4', ...props }) => {
  switch (name) {
    case 'PawPrint':
      return <PawPrint className={className} {...props} />;
    case 'Tag':
      return <Tag className={className} {...props} />;
    case 'Gift':
      return <Gift className={className} {...props} />;
    case 'Plane':
      return <Plane className={className} {...props} />;
    case 'Baby':
      return <Baby className={className} {...props} />;
    case 'Dumbbell':
      return <Dumbbell className={className} {...props} />;
    case 'BookOpen':
      return <BookOpen className={className} {...props} />;
    case 'Music':
      return <Music className={className} {...props} />;
    case 'Film':
      return <Film className={className} {...props} />;
    case 'Scissors':
      return <Scissors className={className} {...props} />;
    case 'Wrench':
      return <Wrench className={className} {...props} />;
    case 'Shield':
      return <Shield className={className} {...props} />;
    case 'Smartphone':
      return <Smartphone className={className} {...props} />;
    case 'Smile':
      return <Smile className={className} {...props} />;
    case 'Store':
      return <Store className={className} {...props} />;
    case 'PiggyBank':
      return <PiggyBank className={className} {...props} />;
    case 'Heart':
      return <Heart className={className} {...props} />;
    case 'Star':
      return <Star className={className} {...props} />;
    case 'Fuel':
      return <Fuel className={className} {...props} />;
    case 'Laptop':
      return <Laptop className={className} {...props} />;
    case 'Home':
      return <Home className={className} {...props} />;
    case 'Utensils':
      return <Utensils className={className} {...props} />;
    case 'Car':
      return <Car className={className} {...props} />;
    case 'HeartPulse':
      return <HeartPulse className={className} {...props} />;
    case 'Coffee':
      return <Coffee className={className} {...props} />;
    case 'GraduationCap':
      return <GraduationCap className={className} {...props} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} {...props} />;
    case 'Tv':
      return <Tv className={className} {...props} />;
    case 'Briefcase':
      return <Briefcase className={className} {...props} />;
    case 'Sparkles':
      return <Sparkles className={className} {...props} />;
    case 'TrendingUp':
      return <TrendingUp className={className} {...props} />;
    case 'Wallet':
      return <Wallet className={className} {...props} />;
    case 'CreditCard':
      return <CreditCard className={className} {...props} />;
    case 'Barcode':
      return <Barcode className={className} {...props} />;
    case 'Banknote':
      return <Banknote className={className} {...props} />;
    case 'ArrowRightLeft':
      return <ArrowRightLeft className={className} {...props} />;
    case 'Zap':
      return <Zap className={className} {...props} />;
    case 'MoreHorizontal':
    default:
      return <MoreHorizontal className={className} {...props} />;
  }
};
