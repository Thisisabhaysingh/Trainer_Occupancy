/**
 * Unified Dashboard Components
 * Shared design system for all dashboards
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Grid,
  useTheme,
  InputAdornment,
  Badge,
  Popover,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Search,
  Download,
  FilterList,
  Add,
  MoreVert,
  ArrowUpward,
  ArrowDownward,
  CalendarToday,
  People,
  School,
  Book,
  TrendingUp,
  AccessTime,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  ChevronLeft,
  ChevronRight,
  KeyboardArrowDown,
  Message as MessageIcon,
  AssignmentOutlined as WorkUpdatesIcon,
  Notifications as NotificationsIcon,
  Home,
  Assessment,
  CalendarMonth,
  Business,
  CardMembership,
  Groups,
  Description,
  Settings,
  HelpOutline,
  Person
} from '@mui/icons-material';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// ============================================
// OMOTEC TYPOGRAPHY SYSTEM
// ============================================
export const typography = {
  // Display Styles
  displayD1: { fontSize: '80px', lineHeight: '88px', letterSpacing: '-0.2px', fontWeight: 700 },
  displayD2: { fontSize: '72px', lineHeight: '80px', letterSpacing: '-0.2px', fontWeight: 700 },
  displayD3: { fontSize: '64px', lineHeight: '72px', letterSpacing: '-0.2px', fontWeight: 700 },

  // Heading Styles
  headingH1: { fontSize: '56px', lineHeight: '64px', letterSpacing: '-0.2px', fontWeight: 700 },
  headingH2: { fontSize: '48px', lineHeight: '56px', letterSpacing: '-0.2px', fontWeight: 700 },
  headingH3: { fontSize: '44px', lineHeight: '52px', letterSpacing: '0', fontWeight: 600 },
  headingH4: { fontSize: '40px', lineHeight: '48px', letterSpacing: '0', fontWeight: 600 },
  headingH5: { fontSize: '36px', lineHeight: '44px', letterSpacing: '-2px', fontWeight: 600 },
  headingH6: { fontSize: '32px', lineHeight: '40px', letterSpacing: '0', fontWeight: 600 },

  // Subheading Styles
  subheadingS1: { fontSize: '28px', lineHeight: '36px', letterSpacing: '0', fontWeight: 600 },
  subheadingS2: { fontSize: '24px', lineHeight: '32px', letterSpacing: '0', fontWeight: 600 },
  subheadingS3: { fontSize: '20px', lineHeight: '28px', letterSpacing: '0', fontWeight: 600 },

  // Paragraph Styles
  paragraphLarge: { fontSize: '18px', lineHeight: '26px', letterSpacing: '0', fontWeight: 400 },
  paragraphMedium: { fontSize: '16px', lineHeight: '24px', letterSpacing: '0', fontWeight: 400 },
  paragraphSmall: { fontSize: '14px', lineHeight: '20px', letterSpacing: '0', fontWeight: 400 },
  paragraphXS: { fontSize: '12px', lineHeight: '16px', letterSpacing: '0', fontWeight: 400 },

  // Overline
  overline: { fontSize: '11px', lineHeight: '19px', letterSpacing: '1px', fontWeight: 500, textTransform: 'uppercase' }
};

// Icon mapping for dynamic icon rendering
const iconMap = {
  course: Book,
  session: AccessTime,
  students: People,
  trainer: School,
  utilization: TrendingUp,
  search: Search,
  download: Download,
  filter: FilterList,
  add: Add,
  more: MoreVert,
  up: ArrowUpward,
  down: ArrowDownward,
  calendar: CalendarToday,
  check: CheckCircle,
  warning: Warning,
  error: ErrorIcon,
  left: ChevronLeft,
  right: ChevronRight,
  dropdown: KeyboardArrowDown,
  home: Home,
  users: People,
  calendarMonth: CalendarMonth,
  branch: Business,
  certificate: CardMembership,
  batches: Groups,
  reports: Assessment,
  documents: Description,
  settings: Settings,
  profile: Person,
  help: HelpOutline,
  projects: Assessment,
  messages: MessageIcon,
  notifications: NotificationsIcon
};

/**
 * StatCard - Metric card with icon (matches reference image style)
 */
export const StatCard = ({
  title,
  value,
  icon = 'course',
  color = 'primary',
  trend,
  trendValue,
  onClick,
  compact = false,
  sx = {}
}) => {
  const theme = useTheme();
  const IconComponent = iconMap[icon] || iconMap.course;

  const colorMap = {
    primary: { main: '#0070F0', light: '#F5FAFF', border: '#D1E6FF', topBg: '#E0F2FE' },
    success: { main: '#12B76A', light: '#F6FEF9', border: '#D1FADF', topBg: '#D1FAE5' },
    warning: { main: '#F79009', light: '#FFFCF5', border: '#FEF0C7', topBg: '#FEF3C7' },
    error: { main: '#F04438', light: '#FFFBFA', border: '#FFEAE2', topBg: '#FEE2E2' },
    purple: { main: '#5220BE', light: '#F5F3FF', border: '#E0DBFF', topBg: '#E0E7FF' }
  };

  const colors = colorMap[color] || colorMap.primary;

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : colors.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? {
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 24px rgba(0,0,0,0.4)'
            : '0 8px 24px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)'
        } : {},
        ...sx
      }}
    >
      {/* Top colored border with arc effect */}
      <Box sx={{
        height: 4,
        bgcolor: colors.main,
        borderRadius: '3px 3px 0 0',
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60%',
          height: 8,
          bgcolor: colors.main,
          borderRadius: '0 0 16px 16px'
        }
      }} />

      <Box sx={{ p: compact ? 2.5 : 4, pt: compact ? 2.25 : 3 }}>
        {/* Title on top */}
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.mode === 'dark' ? '#888' : '#667085',
            fontSize: '14px',
            fontWeight: 500,
            mb: compact ? 0.75 : 1.5
          }}
        >
          {title}
        </Typography>

        {/* Value and icon in same row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontSize: compact ? '32px' : '40px',
              fontWeight: 700,
              color: theme.palette.mode === 'dark' ? '#fff' : '#101828',
              lineHeight: 1.2
            }}
          >
            {value}
          </Typography>

          <Box
            sx={{
              width: compact ? 42 : 48,
              height: compact ? 42 : 48,
              borderRadius: compact ? '10px' : '12px',
              bgcolor: colors.light,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.main
            }}
          >
            <IconComponent sx={{ fontSize: compact ? 21 : 24 }} />
          </Box>
        </Box>

        {/* Trend indicator below if present */}
        {trend && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 1,
              color: trend === 'up' ? '#12B76A' : '#F04438',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {trend === 'up' ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />}
            {trendValue}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

/**
 * PageHeader - Breadcrumb and title section
 */
export const PageHeader = ({ 
  breadcrumbs = [], 
  title, 
  subtitle,
  action,
  sx = {} 
}) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ mb: 4, ...sx }}>
      {breadcrumbs.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <Typography
                variant="body2"
                sx={{
                  color: idx === breadcrumbs.length - 1 
                    ? (theme.palette.mode === 'dark' ? '#fff' : '#101828')
                    : (theme.palette.mode === 'dark' ? '#888' : '#667085'),
                  fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                  cursor: idx < breadcrumbs.length - 1 ? 'pointer' : 'default',
                  '&:hover': idx < breadcrumbs.length - 1 ? { color: '#0070F0' } : {}
                }}
              >
                {crumb}
              </Typography>
              {idx < breadcrumbs.length - 1 && (
                <Typography sx={{ color: theme.palette.mode === 'dark' ? '#666' : '#D0D5DD' }}>
                  &gt;
                </Typography>
              )}
            </React.Fragment>
          ))}
        </Box>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontSize: '28px',
              fontWeight: 700,
              color: theme.palette.mode === 'dark' ? '#fff' : '#101828',
              mb: subtitle ? 0.5 : 0
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.mode === 'dark' ? '#888' : '#667085',
                fontSize: '14px'
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box>{action}</Box>}
      </Box>
    </Box>
  );
};

/**
 * FilterBar - Search, filter, and action buttons
 */
export const FilterBar = ({ 
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  onSearch,
  filters = [],
  actions = [],
  sx = {}
}) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 3,
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 1 }}>
        {searchPlaceholder && (
          <TextField
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSearch?.()}
            InputProps={{
              startAdornment: <Search sx={{ color: theme.palette.mode === 'dark' ? '#666' : '#98A2B3', mr: 1 }} />,
            }}
            sx={{
              minWidth: 280,
              '& .MuiOutlinedInput-root': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                borderRadius: 2,
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#D0D5DD',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#98A2B3',
                },
              }
            }}
          />
        )}
        
        {filters.map((filter, idx) => (
          <TextField
            key={idx}
            select
            placeholder={filter.placeholder}
            value={filter.value}
            onChange={(e) => filter.onChange?.(e.target.value)}
            sx={{
              minWidth: 150,
              '& .MuiOutlinedInput-root': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
                borderRadius: 2,
              }
            }}
          >
            {filter.options?.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        {actions.map((action, idx) => (
          <Button
            key={idx}
            variant={action.variant || 'contained'}
            onClick={action.onClick}
            startIcon={action.icon && iconMap[action.icon] ? React.createElement(iconMap[action.icon]) : null}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              ...(action.variant === 'outlined' && {
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#D0D5DD',
                color: theme.palette.mode === 'dark' ? '#fff' : '#344054',
              })
            }}
          >
            {action.label}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

/**
 * DataTable - Clean table with consistent styling
 */
export const DataTable = ({ 
  columns = [], 
  data = [], 
  onRowClick,
  onSort,
  sortColumn,
  sortDirection,
  selectedRows = [],
  onSelectRow,
  onSelectAll,
  actions,
  sx = {}
}) => {
  const theme = useTheme();
  
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
        overflow: 'hidden',
        ...sx
      }}
    >
      <Table>
        <TableHead>
          <TableRow
            sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#F9FAFB',
            }}
          >
            {onSelectAll && (
              <TableCell padding="checkbox" sx={{ borderBottom: 'none' }}>
                {/* Checkbox header */}
              </TableCell>
            )}
            {columns.map((col) => (
              <TableCell
                key={col.key}
                onClick={() => col.sortable && onSort?.(col.key)}
                sx={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: theme.palette.mode === 'dark' ? '#888' : '#667085',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
                  cursor: col.sortable ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                  '&:hover': col.sortable ? { color: theme.palette.mode === 'dark' ? '#fff' : '#101828' } : {}
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {col.label}
                  {col.sortable && sortColumn === col.key && (
                    sortDirection === 'asc' ? 
                      <ArrowUpward sx={{ fontSize: 14 }} /> : 
                      <ArrowDownward sx={{ fontSize: 14 }} />
                  )}
                </Box>
              </TableCell>
            ))}
            {actions && (
              <TableCell sx={{ borderBottom: 'none', width: 50 }} />
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, rowIdx) => (
            <TableRow
              key={rowIdx}
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#F9FAFB',
                },
                '&:last-child td': {
                  borderBottom: 'none'
                }
              }}
            >
              {onSelectRow && (
                <TableCell padding="checkbox" sx={{ borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}` }}>
                  {/* Checkbox */}
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  sx={{
                    fontSize: '14px',
                    color: theme.palette.mode === 'dark' ? '#fff' : '#101828',
                    borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}`,
                    py: 2
                  }}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </TableCell>
              ))}
              {actions && (
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F2F4F7'}` }}>
                  <IconButton size="small" sx={{ color: theme.palette.mode === 'dark' ? '#888' : '#98A2B3' }}>
                    <MoreVert sx={{ fontSize: 20 }} />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * TabNavigation - Styled tabs
 */
export const TabNavigation = ({ 
  tabs = [], 
  activeTab, 
  onChange,
  sx = {} 
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(35,39,47,0.95)' : '#fff',
        border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#E4E7F0'}`,
        mb: 3,
        ...sx
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(e, v) => onChange?.(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTabs-indicator': {
            bgcolor: '#0070F0',
            height: 3,
            borderRadius: '3px 3px 0 0'
          },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '14px',
            color: theme.palette.mode === 'dark' ? '#888' : '#667085',
            minHeight: 48,
            '&.Mui-selected': {
              color: '#0070F0',
              fontWeight: 700
            }
          }
        }}
      >
        {tabs.map((tab, idx) => (
          <Tab 
            key={idx} 
            label={tab.label}
            icon={tab.icon ? React.createElement(iconMap[tab.icon], { sx: { fontSize: 18 } }) : null}
            iconPosition="start"
          />
        ))}
      </Tabs>
    </Paper>
  );
};

/**
 * Pagination - Page navigation
 */
export const Pagination = ({ 
  currentPage = 1, 
  totalPages = 1, 
  onPageChange,
  sx = {} 
}) => {
  const theme = useTheme();
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
        mt: 3,
        ...sx
      }}
    >
      <IconButton
        onClick={() => onPageChange?.(currentPage - 1)}
        disabled={currentPage === 1}
        sx={{
          color: theme.palette.mode === 'dark' ? '#888' : '#667085',
          '&:disabled': { color: theme.palette.mode === 'dark' ? '#444' : '#D0D5DD' }
        }}
      >
        <ChevronLeft />
      </IconButton>
      
      {getPageNumbers().map((page, idx) => (
        <React.Fragment key={idx}>
          {page === '...' ? (
            <Typography sx={{ color: theme.palette.mode === 'dark' ? '#666' : '#98A2B3', px: 1 }}>
              ...
            </Typography>
          ) : (
            <Button
              onClick={() => onPageChange?.(page)}
              sx={{
                minWidth: 36,
                height: 36,
                borderRadius: '50%',
                fontWeight: currentPage === page ? 700 : 500,
                bgcolor: currentPage === page ? '#0070F0' : 'transparent',
                color: currentPage === page ? '#fff' : (theme.palette.mode === 'dark' ? '#888' : '#667085'),
                '&:hover': {
                  bgcolor: currentPage === page ? '#005AD6' : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F2F4F7')
                }
              }}
            >
              {page}
            </Button>
          )}
        </React.Fragment>
      ))}
      
      <IconButton
        onClick={() => onPageChange?.(currentPage + 1)}
        disabled={currentPage === totalPages}
        sx={{
          color: theme.palette.mode === 'dark' ? '#888' : '#667085',
          '&:disabled': { color: theme.palette.mode === 'dark' ? '#444' : '#D0D5DD' }
        }}
      >
        <ChevronRight />
      </IconButton>
    </Box>
  );
};

/**
 * StatusChip - Colored status indicator
 */
export const StatusChip = ({ 
  status,
  label,
  size = 'small'
}) => {
  const theme = useTheme();
  
  const statusMap = {
    active: { color: '#12B76A', bg: '#F6FEF9', label: label || 'Active' },
    inactive: { color: '#667085', bg: '#F2F4F7', label: label || 'Inactive' },
    pending: { color: '#F79009', bg: '#FFFCF5', label: label || 'Pending' },
    error: { color: '#F04438', bg: '#FFFBFA', label: label || 'Error' },
    completed: { color: '#0070F0', bg: '#F5FAFF', label: label || 'Completed' }
  };
  
  const config = statusMap[status] || statusMap.inactive;
  
  return (
    <Chip
      label={config.label}
      size={size}
      sx={{
        bgcolor: theme.palette.mode === 'dark' ? `${config.color}20` : config.bg,
        color: config.color,
        fontWeight: 600,
        fontSize: size === 'small' ? '12px' : '14px',
        height: size === 'small' ? 24 : 32,
        borderRadius: 100,
        '& .MuiChip-label': {
          px: 1.5
        }
      }}
    />
  );
};

/**
 * AvatarCell - Avatar with name/email display
 */
export const AvatarCell = ({ 
  name,
  email,
  avatarUrl,
  size = 'medium'
}) => {
  const theme = useTheme();
  
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  
  const sizeMap = {
    small: { avatar: 32, fontSize: '12px' },
    medium: { avatar: 40, fontSize: '14px' },
    large: { avatar: 48, fontSize: '16px' }
  };
  
  const s = sizeMap[size];
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar
        src={avatarUrl}
        sx={{
          width: s.avatar,
          height: s.avatar,
          bgcolor: theme.palette.mode === 'dark' ? '#4f6ef7' : '#e3e8f7',
          color: theme.palette.mode === 'dark' ? '#fff' : '#344054',
          fontWeight: 600,
          fontSize: s.fontSize
        }}
      >
        {!avatarUrl && initials}
      </Avatar>
      <Box>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: '14px',
            color: theme.palette.mode === 'dark' ? '#fff' : '#101828'
          }}
        >
          {name}
        </Typography>
        {email && (
          <Typography
            sx={{
              fontSize: '12px',
              color: theme.palette.mode === 'dark' ? '#888' : '#667085'
            }}
          >
            {email}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/**
 * Sidebar - Left navigation sidebar matching reference design
 */
export const Sidebar = ({
  items = [],
  activeItem,
  onItemClick,
  logo = '/omotec-logo.webp',
  user,
  onLogout
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: 240,
        height: '100vh',
        bgcolor: theme.palette.mode === 'dark' ? '#101828' : '#fff',
        borderRight: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#E4E7F0'}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          minHeight: 96,
          px: 3,
          py: 2,
          borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#E4E7F0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="OMOTEC logo"
          sx={{
            display: 'block',
            width: '100%',
            maxWidth: 180,
            height: 'auto',
            objectFit: 'contain'
          }}
        />
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          flex: 1,
          py: 2,
          overflowY: 'auto',
          pb: 6,
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'dark' ? '#4b5563' : '#cbd5e1',
            borderRadius: 4,
          }
        }}
      >
        {items.map((section, idx) => (
          <Box key={idx} sx={{ mb: 3 }}>
            <Typography
              sx={{
                ...typography.overline,
                px: 3,
                mb: 1,
                color: theme.palette.mode === 'dark' ? '#667085' : '#98A2B3'
              }}
            >
              {section.title}
            </Typography>
                  {section.items.map((item) => {
              const Icon = iconMap[item.icon] || Book;
              const isParentActive = activeItem === item.id || item.children?.some((child) => child.id === activeItem);
              return (
                <Box key={item.id}>
                  <Box
                    onClick={() => onItemClick?.(item.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      px: 3,
                      py: 2,
                      cursor: 'pointer',
                      borderLeft: isParentActive ? '3px solid #0070F0' : '3px solid transparent',
                      bgcolor: isParentActive
                        ? (theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.1)' : '#F5FAFF')
                        : 'transparent',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
                      }
                    }}
                  >
                    <Icon
                      sx={{
                        fontSize: 20,
                        color: isParentActive ? '#0070F0' : (theme.palette.mode === 'dark' ? '#667085' : '#667085')
                      }}
                    />
                    <Typography
                      sx={{
                        ...typography.paragraphMedium,
                        color: isParentActive
                          ? '#0070F0'
                          : (theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054'),
                        fontWeight: isParentActive ? 600 : 500
                      }}
                    >
                      {item.label}
                    </Typography>
                    {item.badge && (
                      <Chip
                        label={item.badge}
                        size="small"
                        sx={{
                          ml: 'auto',
                          height: 20,
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.18)' : '#FFF7E6',
                          color: theme.palette.mode === 'dark' ? '#FBBF24' : '#B54708',
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    )}
                  </Box>
                  {item.children && isParentActive && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', pl: 8, pr: 3, py: 1, gap: 1 }}>
                      {item.children.map((child) => {
                        const isActive = activeItem === child.id;
                        return (
                          <Box
                            key={child.id}
                            onClick={() => onItemClick?.(child.id)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 2,
                              px: 1,
                              py: 1,
                              cursor: 'pointer',
                              borderLeft: isActive ? '3px solid #0070F0' : '3px solid transparent',
                              bgcolor: isActive
                                ? (theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.1)' : '#F5FAFF')
                                : 'transparent',
                              '&:hover': {
                                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
                              }
                            }}
                          >
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isActive ? '#0070F0' : '#CBD5E1' }} />
                            <Typography
                              sx={{
                                ...typography.paragraphSmall,
                                color: isActive
                                  ? '#0070F0'
                                  : (theme.palette.mode === 'dark' ? '#CED4DA' : '#667085'),
                                fontWeight: isActive ? 600 : 500
                              }}
                            >
                              {child.label}
                            </Typography>
                            {child.badge && (
                              <Chip
                                label={child.badge}
                                size="small"
                                sx={{
                                  ml: 'auto',
                                  height: 18,
                                  fontSize: '0.6rem',
                                  fontWeight: 600,
                                  '& .MuiChip-label': { px: 0.65 },
                                }}
                              />
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* User Section */}
      {user && (
        <Box
          sx={{
            p: 3,
            borderTop: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#E4E7F0'}`,
            mt: 'auto',
            flexShrink: 0
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar src={user.avatar} sx={{ width: 40, height: 40 }}>
              {user.name?.[0]}
            </Avatar>
            <Box>
              <Typography sx={{ ...typography.paragraphMedium, fontWeight: 600, color: theme.palette.mode === 'dark' ? '#fff' : '#101828' }}>
                {user.name}
              </Typography>
              <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
                {user.role}
              </Typography>
            </Box>
          </Box>
          {onLogout && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={onLogout}
              sx={{
                borderColor: theme.palette.mode === 'dark' ? '#344054' : '#D0D5DD',
                color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054',
                '&:hover': {
                  borderColor: '#F04438',
                  color: '#F04438'
                }
              }}
            >
              Logout
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

/**
 * Header - Top header bar matching reference design
 */
export const Header = ({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchOptions = [],
  onSearchSelect,
  searchPlaceholder = 'Search dashboard...',
  notifications = 0,
  messages = 0,
  rightContent,
  user,
  onNotificationClick,
  onMessageClick,
  onUserClick
}) => {
  const theme = useTheme();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState({ messages: messages || 0, notifications: notifications || 0 });
  const [anchorEl, setAnchorEl] = useState(null);
  const [activePanel, setActivePanel] = useState('notification');
  const [reminderOpen, setReminderOpen] = useState(false);
  const [serverAlert, setServerAlert] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const previousUnreadTotal = useRef(null);
  const reminderTimer = useRef(null);

  const filteredSearchOptions = useMemo(() => {
    const query = String(searchValue || '').trim().toLowerCase();
    if (!query) return [];
    return searchOptions
      .filter((option) => {
        const searchable = [
          option.label,
          option.group,
          ...(option.keywords || [])
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 8);
  }, [searchOptions, searchValue]);

  const selectSearchOption = (option) => {
    if (!option) return;
    onSearchSelect?.(option);
    onSearchChange?.('');
    setSearchFocused(false);
  };

  const playSoftTone = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.36);
      window.setTimeout(() => context.close(), 500);
    } catch (error) {
      // Browser may block sound until user interaction.
    }
  };

  const fetchNotifications = async ({ silent = true } = {}) => {
    try {
      const response = await axios.get(`${apiBaseUrl}/api/notifications`, { withCredentials: true });
      if (!response.data?.success) return;

      const nextUnread = response.data.unread || { messages: 0, notifications: 0 };
      const nextTotal = (nextUnread.messages || 0) + (nextUnread.notifications || 0);
      if (previousUnreadTotal.current !== null && nextTotal > previousUnreadTotal.current && !silent) {
        const latestUnread = (response.data.notifications || []).find(item => !item.isRead);
        if (latestUnread) {
          setServerAlert({
            title: latestUnread.title || 'MIS notification',
            body: latestUnread.body || '',
            type: latestUnread.type || 'notification'
          });
        }
        playSoftTone();
      }
      previousUnreadTotal.current = nextTotal;
      setItems(response.data.notifications || []);
      setUnread(nextUnread);
    } catch (error) {
      // Keep header quiet if the notification table patch has not been run yet.
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = window.setInterval(() => fetchNotifications({ silent: false }), 10000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const scheduleReminder = () => {
      if (reminderTimer.current) window.clearTimeout(reminderTimer.current);

      const now = new Date();
      const next = new Date();
      next.setHours(18, 0, 0, 0);
      if (now >= next) next.setDate(next.getDate() + 1);
      while (next.getDay() === 0) next.setDate(next.getDate() + 1);

      reminderTimer.current = window.setTimeout(() => {
        const todayKey = next.toISOString().slice(0, 10);
        const storageKey = `productivityReminder:${todayKey}`;
        if (window.localStorage.getItem(storageKey) !== 'shown') {
          window.localStorage.setItem(storageKey, 'shown');
          const reminderItem = {
            id: `productivity-reminder-${todayKey}`,
            type: 'notification',
            title: 'Productivity reminder',
            body: 'Please update productivity sheet',
            isRead: false,
            isLocal: true,
            createdAt: new Date().toISOString()
          };
          setItems(prev => [reminderItem, ...prev]);
          setUnread(prev => ({ ...prev, notifications: (prev.notifications || 0) + 1 }));
          setReminderOpen(true);
          playSoftTone();
        }
        scheduleReminder();
      }, Math.max(1000, next.getTime() - now.getTime()));
    };

    scheduleReminder();
    return () => {
      if (reminderTimer.current) window.clearTimeout(reminderTimer.current);
    };
  }, []);

  const panelItems = useMemo(
    () => items.filter(item => item.type === activePanel).slice(0, 10),
    [items, activePanel]
  );

  const handleOpenPanel = (event, panel) => {
    setActivePanel(panel);
    setAnchorEl(event.currentTarget);
    if (panel === 'message') onMessageClick?.();
    if (panel === 'notification') onNotificationClick?.();
  };

  const handleItemClick = async (item) => {
    try {
      if (item.isLocal) {
        setItems(prev => prev.map(current => current.id === item.id ? { ...current, isRead: true } : current));
        setUnread(prev => ({
          ...prev,
          notifications: item.type === 'notification' ? Math.max(0, (prev.notifications || 0) - 1) : prev.notifications,
          messages: item.type === 'message' ? Math.max(0, (prev.messages || 0) - 1) : prev.messages
        }));
        return;
      }

      if (!item.isRead) {
        await axios.put(`${apiBaseUrl}/api/notifications/${item.id}/read`, {}, { withCredentials: true });
        await fetchNotifications();
      }
    } catch (error) {
      // Non-blocking; the dropdown still closes naturally.
    }
  };

  const markPanelRead = async () => {
    try {
      setItems(prev => prev.map(item => item.isLocal && item.type === activePanel ? { ...item, isRead: true } : item));
      setUnread(prev => ({ ...prev, [activePanel === 'message' ? 'messages' : 'notifications']: 0 }));
      await axios.put(`${apiBaseUrl}/api/notifications/read-all/${activePanel}`, {}, { withCredentials: true });
      await fetchNotifications();
    } catch (error) {
      // Non-blocking.
    }
  };

  return (
    <>
      <Box
        sx={{
          height: 72,
          bgcolor: theme.palette.mode === 'dark' ? '#101828' : '#fff',
          borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#E4E7F0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 4,
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
      {/* Search */}
      <Box sx={{ flex: 1, maxWidth: 480, position: 'relative' }}>
        <TextField
          fullWidth
          placeholder={searchPlaceholder}
          value={searchValue || ''}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (filteredSearchOptions[0]) selectSearchOption(filteredSearchOptions[0]);
              else onSearchSubmit?.();
            }
            if (e.key === 'Escape') {
              onSearchChange?.('');
              setSearchFocused(false);
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: theme.palette.mode === 'dark' ? '#667085' : '#98A2B3' }} />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: theme.palette.mode === 'dark' ? '#1D2939' : '#F9FAFB',
              borderRadius: 2,
              height: 44,
              '& fieldset': {
                borderColor: theme.palette.mode === 'dark' ? '#344054' : '#E4E7F0'
              }
            }
          }}
        />
        {searchFocused && String(searchValue || '').trim() && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: 50,
              left: 0,
              right: 0,
              zIndex: 1200,
              overflow: 'hidden',
              border: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#E4E7F0'}`,
              bgcolor: theme.palette.mode === 'dark' ? '#1D2939' : '#fff'
            }}
          >
            {filteredSearchOptions.length > 0 ? (
              <List dense disablePadding>
                {filteredSearchOptions.map((option) => (
                  <ListItemButton key={`${option.group || 'dashboard'}-${option.id}`} onMouseDown={() => selectSearchOption(option)}>
                    <Search sx={{ mr: 1.5, fontSize: 18, color: '#667085' }} />
                    <ListItemText
                      primary={option.label}
                      secondary={option.group}
                      primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: 11 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            ) : (
              <Typography sx={{ px: 2, py: 1.5, fontSize: 13, color: '#667085' }}>
                No dashboard section found
              </Typography>
            )}
          </Paper>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 3 }}>
        {rightContent}
        <Tooltip title="Work updates: tasks, jobs, and reviews" arrow>
          <IconButton
            aria-label="Open work updates"
            onClick={(event) => handleOpenPanel(event, 'message')}
            sx={{ color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}
          >
            <Badge badgeContent={unread.messages || 0} color="primary">
              <WorkUpdatesIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <Tooltip title="Notifications: assignments and reminders" arrow>
          <IconButton
            aria-label="Open notifications"
            onClick={(event) => handleOpenPanel(event, 'notification')}
            sx={{ color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}
          >
            <Badge badgeContent={unread.notifications || 0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <Box
          onClick={onUserClick}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ml: 2,
            cursor: 'pointer',
            px: 2,
            py: 1,
            borderRadius: 2,
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
            }
          }}
        >
          <Typography sx={{ ...typography.paragraphMedium, fontWeight: 500, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#344054' }}>
            {user?.name}
          </Typography>
          <KeyboardArrowDown sx={{ color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }} />
        </Box>
      </Box>
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: 360,
            borderRadius: 2,
            mt: 1,
            bgcolor: theme.palette.mode === 'dark' ? '#1D2939' : '#fff',
            border: `1px solid ${theme.palette.mode === 'dark' ? '#344054' : '#EAECF0'}`
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ ...typography.paragraphMedium, fontWeight: 700, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}>
            {activePanel === 'message' ? 'Work updates' : 'Notifications'}
          </Typography>
          <Button size="small" onClick={markPanelRead} sx={{ textTransform: 'none' }}>
            Mark read
          </Button>
        </Box>
        <Divider />
        <List sx={{ py: 0, maxHeight: 360, overflowY: 'auto' }}>
          {panelItems.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ color: theme.palette.mode === 'dark' ? '#98A2B3' : '#667085', fontSize: 14 }}>
                {activePanel === 'message'
                  ? 'No task, job, or review updates yet.'
                  : 'No assignment notifications or reminders yet.'}
              </Typography>
            </Box>
          ) : panelItems.map(item => (
            <ListItemButton
              key={item.id}
              onClick={() => handleItemClick(item)}
              sx={{
                alignItems: 'flex-start',
                bgcolor: item.isRead ? 'transparent' : (theme.palette.mode === 'dark' ? 'rgba(0,112,240,0.10)' : '#EFF6FF')
              }}
            >
              <ListItemText
                primary={item.title}
                secondary={`${item.body || ''}${item.createdAt ? ` - ${new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}`}
                primaryTypographyProps={{ fontSize: 14, fontWeight: item.isRead ? 500 : 700, color: theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828' }}
                secondaryTypographyProps={{ fontSize: 12.5, color: theme.palette.mode === 'dark' ? '#98A2B3' : '#667085', mt: 0.5 }}
              />
            </ListItemButton>
          ))}
        </List>
      </Popover>

      <Snackbar
        open={reminderOpen}
        autoHideDuration={10000}
        onClose={() => setReminderOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity="info" variant="filled" onClose={() => setReminderOpen(false)}>
          Please update productivity sheet
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(serverAlert)}
        autoHideDuration={8000}
        onClose={() => setServerAlert(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={serverAlert?.type === 'message' ? 'success' : 'info'} variant="filled" onClose={() => setServerAlert(null)}>
          <strong>{serverAlert?.title}</strong>
          {serverAlert?.body ? ` - ${serverAlert.body}` : ''}
        </Alert>
      </Snackbar>
    </>
  );
};

/**
 * Breadcrumb - Navigation breadcrumb matching reference design
 */
export const Breadcrumb = ({ items = [], separator = '>' }) => {
  const theme = useTheme();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <Typography sx={{ ...typography.paragraphSmall, color: theme.palette.mode === 'dark' ? '#667085' : '#667085' }}>
              {separator}
            </Typography>
          )}
          <Typography
            sx={{
              ...typography.paragraphSmall,
              color: item.active
                ? (theme.palette.mode === 'dark' ? '#F2F4F7' : '#101828')
                : (theme.palette.mode === 'dark' ? '#667085' : '#667085'),
              fontWeight: item.active ? 600 : 400,
              cursor: item.onClick ? 'pointer' : 'default',
              '&:hover': item.onClick ? { color: '#0070F0' } : {}
            }}
            onClick={item.onClick}
          >
            {item.label}
          </Typography>
        </React.Fragment>
      ))}
    </Box>
  );
};

export default {
  StatCard,
  PageHeader,
  FilterBar,
  DataTable,
  TabNavigation,
  Pagination,
  StatusChip,
  AvatarCell,
  Sidebar,
  Header,
  Breadcrumb,
  typography
};
