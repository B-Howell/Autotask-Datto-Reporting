import { Box, Card, CardContent, Typography } from '@mui/material';
import type { FirstCallResolution } from '@/api';
import { TICKET_CARD_SX } from './cardStyles';

interface FirstCallResolutionCardProps {
  resolution: FirstCallResolution | null | undefined;
}

const FirstCallResolutionCard = ({ resolution }: FirstCallResolutionCardProps) => (
  <Card sx={TICKET_CARD_SX}>
    <CardContent>
      <Typography variant="h6" sx={{ mb: 2 }}>
        First Call Resolution
      </Typography>
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography
          variant="h2"
          sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'primary.main' }}
        >
          {resolution ? `${resolution.percentage}%` : 'N/A'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {resolution
            ? `${resolution.phone_tickets_fcr} of ${resolution.phone_tickets_total} phone tickets`
            : 'No phone tickets found'}
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

export default FirstCallResolutionCard;
