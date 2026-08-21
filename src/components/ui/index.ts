/**
 * Barrel export for shared UI primitives.
 *
 * Prefer:
 *   import { Button, Card, EmptyState } from '@/components/ui';
 *
 * Deep imports (`@/components/ui/Button`) still work.
 */

export { Alert, type AlertProps, type AlertVariant } from './Alert';
export { Avatar, type AvatarProps } from './Avatar';
export { Badge, type BadgeProps, type BadgeTone } from './Badge';
export { BrandLogo } from './BrandLogo';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button';
export {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  type CardProps,
} from './Card';
export { Checkbox, type CheckboxProps } from './Checkbox';
export {
  DescriptionItem,
  DescriptionList,
  type DescriptionItemProps,
  type DescriptionListProps,
} from './DescriptionList';
export { DetailSection, type DetailSectionProps } from './DetailSection';
export { Dialog, type DialogProps } from './Dialog';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export {
  FileDropzone,
  type FileDropzoneProps,
} from './FileDropzone';
export {
  FilterBar,
  type FilterBarColumns,
  type FilterBarProps,
} from './FilterBar';
export {
  FormActions,
  type FormActionsProps,
} from './FormActions';
export { FormField, type FormFieldProps } from './FormField';
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from './IconButton';
export { Input, type FieldSize, type InputProps } from './Input';
export { Label, type LabelProps } from './Label';
export {
  ListSummaryCard,
  type ListSummaryCardProps,
} from './ListSummaryCard';
export {
  MetricTile,
  type MetricTileProps,
  type MetricTileTone,
} from './MetricTile';
export { PageHeader, type PageHeaderProps } from './PageHeader';
export {
  Progress,
  type ProgressProps,
  type ProgressSize,
  type ProgressTone,
} from './Progress';
export { SearchInput, type SearchInputProps } from './SearchInput';
export { Select, type SelectProps } from './Select';
export { Spinner, type SpinnerProps, type SpinnerSize } from './Spinner';
export {
  StatCard,
  type StatCardProps,
  type StatCardTone,
} from './StatCard';
export { Switch, type SwitchProps } from './Switch';
export {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  type TableEmptyProps,
} from './Table';
export { TableCard, type TableCardProps } from './TableCard';
export { Tab, TabList, TabPanel, Tabs, type TabPanelProps, type TabProps, type TabsProps } from './Tabs';
export { Textarea, type TextareaProps } from './Textarea';

// Default-export modules re-exported as named for one-line imports
export { default as AppLoader } from './AppLoader';
export { default as ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogMode, ConfirmDialogVariant } from './ConfirmDialog';
export { default as FullScreenModal } from './FullScreenModal';
export { default as HomeTraceLoader } from './HomeTraceLoader';
export {
  RouteAwareLoader,
  RouteLoadingFallback,
  useRouteLoader,
  useRouteReady,
} from '@/components/layout/route-loader';
export { default as Pagination } from './Pagination';
export { default as SectionedFormShell, SectionCard } from './SectionedFormShell';
export type {
  SectionedFormDialogProps,
  SectionedFormModalProps,
  SectionedFormPageProps,
  SectionedFormSection,
  SectionedFormShellProps,
} from './SectionedFormShell';
export { default as Skeleton } from './Skeleton';
export { default as SkeletonCard } from './SkeletonCard';
export { default as SkeletonList } from './SkeletonList';
export { default as SkeletonTable } from './SkeletonTable';
export { default as Toast } from './Toast';
export { default as ToastContainer } from './ToastContainer';
