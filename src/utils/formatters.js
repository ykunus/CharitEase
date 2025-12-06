// Utility functions for formatting data

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  const number = typeof num === 'number' ? num : parseInt(num, 10) || 0;
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  } else if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  }
  return number.toString();
};

export const formatDate = (dateString) => {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Just now';
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
};

export const getPostTypeIcon = (type) => {
  switch (type) {
    case 'milestone':
      return '🎉';
    case 'update':
      return '📢';
    case 'story':
      return '📖';
    default:
      return '📝';
  }
};

export const getPostTypeColor = (type) => {
  switch (type) {
    case 'milestone':
      return '#22C55E'; // Green
    case 'update':
      return '#3B82F6'; // Blue
    case 'story':
      return '#F59E0B'; // Orange
    default:
      return '#6B7280'; // Gray
  }
};
