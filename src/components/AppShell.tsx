import { useState, type ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import MenuIcon from '@mui/icons-material/Menu';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined';
import EventNoteIcon from '@mui/icons-material/EventNote';
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';

import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../theme/ColorModeContext';
import { useServices } from '../query/hooks';
import { useToast } from './ToastProvider';

const RAIL_WIDTH = 244;

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { label: 'Book a trip', path: '/book', icon: <AddCircleOutlineIcon /> },
  { label: 'Bookings', path: '/bookings', icon: <EventNoteIcon /> },
  { label: 'Trips', path: '/trips', icon: <LocalTaxiIcon /> },
  { label: 'Invoices', path: '/invoices', icon: <ReceiptLongIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsOutlinedIcon /> },
];

function isActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(path + '/');
}

function BrandMark() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, height: 60 }}>
      <Box
        aria-hidden
        sx={{
          width: 30,
          height: 30,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: '-0.03em',
        }}
      >
        A
      </Box>
      <Box sx={{ lineHeight: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
          ATS Portal
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Facility scheduling
        </Typography>
      </Box>
    </Box>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <List component="nav" aria-label="Main navigation" sx={{ px: 1.5, py: 1 }}>
      {NAV.map((item) => {
        const active = isActive(pathname, item.path);
        return (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              onClick={onNavigate}
              selected={active}
              aria-current={active ? 'page' : undefined}
              sx={{
                borderRadius: 2,
                py: 1,
                color: active ? 'primary.main' : 'text.secondary',
                '&.Mui-selected': {
                  bgcolor: (t) =>
                    t.palette.mode === 'light' ? 'rgba(14,110,98,0.10)' : 'rgba(79,179,164,0.16)',
                  '&:hover': {
                    bgcolor: (t) =>
                      t.palette.mode === 'light'
                        ? 'rgba(14,110,98,0.16)'
                        : 'rgba(79,179,164,0.22)',
                  },
                },
                '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 38 },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: { sx: { fontWeight: active ? 700 : 500, fontSize: '0.9rem' } },
                }}
              />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
}

function AccountMenu({ payerName }: { payerName?: string }) {
  const { user, logout } = useAuth();
  const { mode, toggle } = useColorMode();
  const navigate = useNavigate();
  const toast = useToast();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const initials =
    `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() ||
    (user?.email?.[0]?.toUpperCase() ?? '?');
  const fullName =
    user?.first_name || user?.last_name
      ? `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()
      : (user?.username ?? 'Account');

  const handleLogout = async () => {
    setAnchor(null);
    await logout();
    toast.info('Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          size="small"
          aria-label="Account menu"
          aria-haspopup="true"
          sx={{ ml: 0.5 }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 268, mt: 1, overflow: 'visible' } } }}
      >
        {/* Identity block */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }} noWrap>
              {fullName}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
              {user?.email}
            </Typography>
          </Box>
        </Box>
        {payerName && (
          <Box sx={{ px: 2, pb: 1.25 }}>
            <Chip
              size="small"
              label={payerName}
              variant="outlined"
              sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
            />
          </Box>
        )}
        <Divider />

        {/* Appearance toggle — mirrors the header control for discoverability */}
        <MenuItem
          onClick={(e) => {
            e.preventDefault();
            toggle();
          }}
          sx={{ justifyContent: 'space-between' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ListItemIcon>
              {mode === 'light' ? (
                <LightModeOutlinedIcon fontSize="small" />
              ) : (
                <DarkModeOutlinedIcon fontSize="small" />
              )}
            </ListItemIcon>
            Appearance
          </Box>
          <Switch
            checked={mode === 'dark'}
            size="small"
            slotProps={{ input: { 'aria-label': 'Toggle dark mode' } }}
            onClick={(e) => e.stopPropagation()}
            onChange={toggle}
          />
        </MenuItem>

        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate('/settings');
          }}
        >
          <ListItemIcon>
            <LockResetIcon fontSize="small" />
          </ListItemIcon>
          Change password
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}

export function AppShell() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode, toggle } = useColorMode();
  const location = useLocation();

  // One cached services call powers the top-bar payer name (and the Book page).
  const { data: services } = useServices();
  const payerName = services?.payer;

  const railContent = (
    <>
      <BrandMark />
      <Divider />
      <NavList onNavigate={() => setMobileOpen(false)} />
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Permanent rail on md+ */}
      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: RAIL_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: RAIL_WIDTH, boxSizing: 'border-box' },
          }}
          open
        >
          {railContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: RAIL_WIDTH, boxSizing: 'border-box' } }}
        >
          {railContent}
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky">
          <Toolbar sx={{ gap: 1 }}>
            {!isDesktop && (
              <IconButton
                edge="start"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 0.5 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {payerName && (
                <>
                  <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                    Booking for
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }} noWrap>
                    {payerName}
                  </Typography>
                </>
              )}
            </Box>
            <Tooltip title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
              <IconButton onClick={toggle} aria-label="Toggle color mode">
                {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
              </IconButton>
            </Tooltip>
            <AccountMenu payerName={payerName} />
          </Toolbar>
        </AppBar>

        {/* Route crossfade: keyed on pathname, disabled under reduced motion by the global rule. */}
        <Box
          key={location.pathname}
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            p: { xs: 2, sm: 3 },
            '@media (prefers-reduced-motion: no-preference)': {
              animation: 'ats-route-fade 160ms cubic-bezier(0.22,1,0.36,1)',
            },
            '@keyframes ats-route-fade': {
              from: { opacity: 0, transform: 'translateY(4px)' },
              to: { opacity: 1, transform: 'none' },
            },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
