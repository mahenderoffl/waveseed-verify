// ─── icons.js — one consistent icon set (Lucide, ISC licence) ─────────────────
// Usage:  icon('users')                      -> decorative 18px icon
//         icon('shield-check', { size: 22 }) -> bigger
//         icon('bell', { label: 'Alerts' })  -> meaningful icon (gets role="img" + aria-label)
//
// Only icons listed here are bundled (the library is tree-shaken), so add new ones here.
import {
  House, LayoutDashboard, Users, UserRound, UserPlus, UserCheck, FileText, FilePlus2, FileCheck2, FileWarning,
  Files, Award, ShieldCheck, ChartColumn, Settings, Building2, QrCode, Upload, Download, LogOut, Search, Bell,
  Menu, X, ChevronDown, ChevronRight, ChevronLeft, ChevronUp, ChevronsUpDown, Plus, Check, CheckCheck,
  TriangleAlert, CircleAlert, Info, Clock, Calendar, CalendarDays, Mail, Phone, MapPin, Link, Copy, ExternalLink,
  Eye, EyeOff, Pencil, Trash2, Ellipsis, EllipsisVertical, Filter, SlidersHorizontal, ArrowRight, ArrowLeft,
  ArrowUpRight, TrendingUp, Sparkles, Fingerprint, IdCard, GraduationCap, Briefcase, Landmark, Camera, Image,
  ClipboardList, History, Lock, KeyRound, Globe, Printer, Share2, RefreshCw, LoaderCircle, Zap, Layers,
  FolderOpen, Archive, Ban, RotateCcw, Hourglass, BadgeCheck, Stamp, PenLine, Palette, Star, Command,
  CircleCheck, CircleX, Inbox, ScanLine, Smartphone, Monitor, FileDown, Send, Save, WandSparkles, Eraser,
  PanelLeft, PanelLeftClose, Moon, Sun, Rocket, Target, Receipt, IndianRupee, Timer, BellRing, MessageSquare,
  CirclePlus, BookOpen, Contact, PartyPopper, ListChecks, CloudUpload, FileImage, Paperclip, ScanFace,
} from 'lucide';

const ICONS = {
  'home': House, 'dashboard': LayoutDashboard, 'users': Users, 'user': UserRound, 'user-plus': UserPlus,
  'user-check': UserCheck, 'file-text': FileText, 'file-plus': FilePlus2, 'file-check': FileCheck2,
  'file-warning': FileWarning, 'files': Files, 'award': Award, 'shield-check': ShieldCheck, 'chart': ChartColumn,
  'settings': Settings, 'building': Building2, 'qr-code': QrCode, 'upload': Upload, 'download': Download,
  'log-out': LogOut, 'search': Search, 'bell': Bell, 'menu': Menu, 'x': X, 'chevron-down': ChevronDown,
  'chevron-right': ChevronRight, 'chevron-left': ChevronLeft, 'chevron-up': ChevronUp,
  'chevrons-up-down': ChevronsUpDown, 'plus': Plus, 'check': Check, 'check-all': CheckCheck,
  'alert-triangle': TriangleAlert, 'alert-circle': CircleAlert, 'info': Info, 'clock': Clock,
  'calendar': Calendar, 'calendar-days': CalendarDays, 'mail': Mail, 'phone': Phone, 'map-pin': MapPin,
  'link': Link, 'copy': Copy, 'external-link': ExternalLink, 'eye': Eye, 'eye-off': EyeOff, 'pencil': Pencil,
  'trash': Trash2, 'more': Ellipsis, 'more-vertical': EllipsisVertical, 'filter': Filter,
  'sliders': SlidersHorizontal, 'arrow-right': ArrowRight, 'arrow-left': ArrowLeft, 'arrow-up-right': ArrowUpRight,
  'trending-up': TrendingUp, 'sparkles': Sparkles, 'fingerprint': Fingerprint, 'id-card': IdCard,
  'graduation-cap': GraduationCap, 'briefcase': Briefcase, 'bank': Landmark, 'camera': Camera, 'image': Image,
  'clipboard-list': ClipboardList, 'history': History, 'lock': Lock, 'key': KeyRound, 'globe': Globe,
  'printer': Printer, 'share': Share2, 'refresh': RefreshCw, 'loader': LoaderCircle, 'zap': Zap, 'layers': Layers,
  'folder-open': FolderOpen, 'archive': Archive, 'ban': Ban, 'restore': RotateCcw, 'hourglass': Hourglass,
  'badge-check': BadgeCheck, 'stamp': Stamp, 'signature': PenLine, 'palette': Palette, 'star': Star,
  'command': Command, 'circle-check': CircleCheck, 'circle-x': CircleX, 'inbox': Inbox, 'scan': ScanLine,
  'smartphone': Smartphone, 'monitor': Monitor, 'file-down': FileDown, 'send': Send, 'save': Save,
  'wand': WandSparkles, 'eraser': Eraser, 'panel-left': PanelLeft, 'panel-left-close': PanelLeftClose,
  'moon': Moon, 'sun': Sun, 'rocket': Rocket, 'target': Target, 'receipt': Receipt, 'rupee': IndianRupee,
  'timer': Timer, 'bell-ring': BellRing, 'message': MessageSquare, 'circle-plus': CirclePlus, 'book': BookOpen,
  'contact': Contact, 'party': PartyPopper, 'checklist': ListChecks, 'cloud-upload': CloudUpload,
  'file-image': FileImage, 'paperclip': Paperclip, 'scan-face': ScanFace,
};

const escAttr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function icon(name, { size = 18, stroke = 1.75, cls = '', label = '' } = {}) {
  const node = ICONS[name];
  if (!node) {
    if (typeof console !== 'undefined') console.warn(`[icons] unknown icon "${name}"`);
    return '';
  }
  const inner = node.map(([tag, attrs]) =>
    `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${escAttr(v)}"`).join(' ')}/>`).join('');
  const a11y = label ? `role="img" aria-label="${escAttr(label)}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon${cls ? ' ' + cls : ''}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${inner}</svg>`;
}

export const iconNames = () => Object.keys(ICONS);
