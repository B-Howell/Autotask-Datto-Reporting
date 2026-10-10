import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import useAgencyStore from '@/store/agencyStore';
import AddAgencyForm from './AddAgencyForm';

const AgenciesSection = () => {
  const agencies = useAgencyStore((s) => s.agencies);
  const loaded = useAgencyStore((s) => s.loaded);
  const addAgency = useAgencyStore((s) => s.addAgency);
  const removeAgency = useAgencyStore((s) => s.removeAgency);

  return (
    <Paper sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Agencies
      </Typography>
      <List dense>
        {agencies.map((agency) => (
          <ListItem
            key={agency.id}
            secondaryAction={
              <IconButton edge="end" onClick={() => void removeAgency(agency.id)} size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemText
              primary={agency.name}
              secondary={`ID: ${agency.id}, site: ${agency.site}`}
            />
          </ListItem>
        ))}
        {agencies.length === 0 && loaded && (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
            No agencies configured.
          </Typography>
        )}
        {!loaded && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </List>
      <Divider sx={{ my: 2 }} />
      <AddAgencyForm
        isDuplicate={(id) => agencies.some((a) => a.id === id)}
        onAdd={(agency) => void addAgency(agency)}
      />
    </Paper>
  );
};

export default AgenciesSection;
