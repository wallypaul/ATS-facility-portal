import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { EmptyState } from '../components/StateViews';
import ExploreOffIcon from '@mui/icons-material/ExploreOff';

export function NotFoundPage() {
  return (
    <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
      <EmptyState
        icon={<ExploreOffIcon />}
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Button component={RouterLink} to="/bookings" variant="contained">
            Go to bookings
          </Button>
        }
      />
    </Box>
  );
}
