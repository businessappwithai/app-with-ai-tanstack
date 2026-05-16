import * as Icons from 'lucide-react';
import { HTMLAttributes } from 'react';

interface IconProps extends HTMLAttributes<SVGSVGElement> {
  name: string;
  size?: number | string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  activity: Icons.Activity,
  alert: Icons.AlertCircle,
  arrow: Icons.ArrowRight,
  arrowRight: Icons.ArrowRight,
  book: Icons.BookOpen,
  briefcase: Icons.Briefcase,
  calendar: Icons.Calendar,
  chart: Icons.BarChart3,
  check: Icons.Check,
  chevronDown: Icons.ChevronDown,
  clock: Icons.Clock,
  close: Icons.X,
  database: Icons.Database,
  delete: Icons.Trash2,
  document: Icons.FileText,
  download: Icons.Download,
  edit: Icons.Pencil,
  email: Icons.Mail,
  error: Icons.AlertCircle,
  file: Icons.FileText,
  fileJson: Icons.FileJson,
  filter: Icons.Filter,
  folder: Icons.Folder,
  gear: Icons.Settings,
  globe: Icons.Globe,
  home: Icons.Home,
  inbox: Icons.Inbox,
  info: Icons.Info,
  lock: Icons.Lock,
  logout: Icons.LogOut,
  menu: Icons.Menu,
  more: Icons.MoreVertical,
  notification: Icons.Bell,
  package: Icons.Package,
  phone: Icons.Phone,
  pin: Icons.MapPin,
  play: Icons.Play,
  plus: Icons.Plus,
  search: Icons.Search,
  settings: Icons.Settings,
  share: Icons.Share2,
  star: Icons.Star,
  suitcase: Icons.Briefcase,
  table: Icons.Table,
  tag: Icons.Tag,
  target: Icons.Target,
  task: Icons.CheckSquare,
  team: Icons.Users,
  trash: Icons.Trash2,
  trending: Icons.TrendingUp,
  trendingUp: Icons.TrendingUp,
  upload: Icons.Upload,
  user: Icons.User,
  users: Icons.Users,
  view: Icons.Eye,
  warning: Icons.AlertTriangle,
  x: Icons.X,
  zoomIn: Icons.ZoomIn,
  zoomOut: Icons.ZoomOut,
};

export function Icon({ name, size = 24, className, ...props }: IconProps) {
  const IconComponent = iconMap[name.toLowerCase()] || iconMap[name] || Icons.HelpCircle;
  return (
    <IconComponent
      size={typeof size === 'number' ? size : parseInt(size as string)}
      className={className}
      {...props}
    />
  );
}
