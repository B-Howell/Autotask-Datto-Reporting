import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import SettingsIcon from '@mui/icons-material/Settings';
import { HOME_ITEM, NAV_ITEMS } from '@/navigation';

const SLIDE = 'cubic-bezier(0.22, 1, 0.36, 1)';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname === '/settings';

  // One highlight that slides to the active item, rather than each item
  // toggling its own background.
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [indicator, setIndicator] = useState({ top: 0, height: 0, visible: false });
  const [transitionOn, setTransitionOn] = useState(false);
  const positioned = useRef(false);

  useLayoutEffect(() => {
    const el = itemRefs.current[location.pathname];
    if (el) {
      setIndicator({ top: el.offsetTop, height: el.offsetHeight, visible: true });
      if (!positioned.current) {
        positioned.current = true;
        // Animate only after the first placement, so it does not slide in from the top on load.
        requestAnimationFrame(() => setTransitionOn(true));
      }
    } else {
      setIndicator((prev) => ({ ...prev, visible: false }));
    }
  }, [location.pathname]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          position: 'relative',
          boxSizing: 'border-box',
          backgroundColor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          scrollbarGutter: 'auto',
          overflowX: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          component="img"
          src="/app-logo.png"
          alt="IT Reporting"
          draggable={false}
          sx={{ height: 26, width: 'auto', maxWidth: '100%' }}
        />
      </Box>

      <List disablePadding sx={{ px: 0, flexGrow: 1, position: 'relative' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: indicator.height,
            transform: `translateY(${indicator.top}px)`,
            backgroundColor: 'primary.main',
            opacity: indicator.visible ? 1 : 0,
            transition: transitionOn
              ? `transform 0.35s ${SLIDE}, height 0.25s ease, opacity 0.2s ease`
              : 'none',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
        {[HOME_ITEM, ...NAV_ITEMS].map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              ref={(el) => {
                itemRefs.current[item.path] = el;
              }}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 0,
                position: 'relative',
                zIndex: 1,
                backgroundColor: 'transparent',
                color: isActive ? '#fff' : 'text.primary',
                transition: `color 0.35s ${SLIDE}`,
                '&:hover': { backgroundColor: isActive ? 'transparent' : 'action.hover' },
                '& .MuiListItemIcon-root': {
                  color: isActive ? '#fff' : 'text.secondary',
                  transition: `color 0.35s ${SLIDE}`,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: { fontSize: '0.9rem', fontWeight: isActive ? 600 : 400 },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider />
      <List sx={{ px: 0 }}>
        <ListItemButton
          onClick={() => navigate('/settings')}
          selected={isSettings}
          sx={{
            borderRadius: 0,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: '#fff',
              '&:hover': { backgroundColor: 'primary.dark' },
              '& .MuiListItemIcon-root': { color: '#fff' },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: isSettings ? '#fff' : 'text.secondary' }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText
            primary="Settings"
            slotProps={{ primary: { fontSize: '0.9rem', fontWeight: isSettings ? 600 : 400 } }}
          />
        </ListItemButton>
      </List>
    </Drawer>
  );
};

export default NavBar;
