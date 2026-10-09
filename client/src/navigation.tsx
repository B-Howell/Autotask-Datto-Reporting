import type { ReactElement } from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DevicesIcon from '@mui/icons-material/Devices';
import FolderIcon from '@mui/icons-material/Folder';
import HomeIcon from '@mui/icons-material/Home';
import InsightsIcon from '@mui/icons-material/Insights';
import SecurityUpdateGoodIcon from '@mui/icons-material/SecurityUpdateGood';
import StorageIcon from '@mui/icons-material/Storage';
import WindowIcon from '@mui/icons-material/DesktopWindows';

export interface NavItem {
  label: string;
  path: string;
  icon: ReactElement;
  /** One sentence for the home-screen card. */
  description: string;
}

export const HOME_ITEM: NavItem = {
  label: 'Home',
  path: '/',
  icon: <HomeIcon />,
  description: 'Every report, with what it answers.',
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Device Reports',
    path: '/reports/device',
    icon: <DevicesIcon />,
    description:
      'Every desktop, laptop and tablet for a client, with the Autotask asset record merged against the Datto audit. Edit fields in the grid and write them back.',
  },
  {
    label: 'Office / Windows',
    path: '/reports/office-windows',
    icon: <WindowIcon />,
    description:
      'Installed Office products and Windows versions, with licence counts entered against them. Exports to Word and PDF.',
  },
  {
    label: 'Ticket Reports',
    path: '/reports/tickets',
    icon: <ConfirmationNumberIcon />,
    description:
      'A month of tickets by source, priority and issue type, with average time to repair and first-call resolution.',
  },
  {
    label: 'SLA Performance',
    path: '/reports/sla-performance',
    icon: <AssessmentIcon />,
    description:
      'Response and resolution against contracted targets, by ticket, resource, priority and issue type.',
  },
  {
    label: 'Quarterly Utilization',
    path: '/reports/agency-utilization',
    icon: <InsightsIcon />,
    description:
      'Engineer hours per client for a calendar quarter, broken down by billing tier and person.',
  },
  {
    label: 'Annual Utilization',
    path: '/reports/annual-utilization',
    icon: <InsightsIcon />,
    description:
      'A twelve-month view of hours and cost per client at standard rates, with the raw time entries behind it.',
  },
  {
    label: 'Patch Management',
    path: '/reports/patch-management',
    icon: <SecurityUpdateGoodIcon />,
    description:
      "Patch status across a client's workstations, with a summary chart and per-device detail.",
  },
  {
    label: 'HDD Storage Tickets',
    path: '/reports/hdd-tickets',
    icon: <StorageIcon />,
    description:
      'Devices the RMM keeps raising drive-space alerts for, with how often and the drive size.',
  },
  {
    label: 'Saved Reports',
    path: '/reports/saved-reports',
    icon: <FolderIcon />,
    description: 'Every report saved from the app, viewable in place or downloadable.',
  },
];
