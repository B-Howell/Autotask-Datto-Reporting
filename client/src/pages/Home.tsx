import { useNavigate } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { NAV_ITEMS } from '@/navigation';
import type { NavItem } from '@/navigation';

const ReportCard = ({ item }: { item: NavItem }) => {
  const navigate = useNavigate();
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={() => navigate(item.path)} sx={{ height: '100%' }}>
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            {item.icon}
          </Box>
          <Typography variant="h6">{item.label}</Typography>
          <Typography variant="body2" color="text.secondary">
            {item.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

/** A card per report, each opening its page. */
const Home = () => (
  <Box>
    <Typography variant="h5" sx={{ mb: 1, textAlign: 'center' }}>
      Reports
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
      Client reporting from Autotask PSA and Datto RMM. Pick a report to begin.
    </Typography>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 3,
      }}
    >
      {NAV_ITEMS.map((item) => (
        <ReportCard key={item.path} item={item} />
      ))}
    </Box>
  </Box>
);

export default Home;
