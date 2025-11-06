// Centralized delivery type color and icon mapping
export const DELIVERY_TYPE_STYLES = {
  HARD: {
    color: '#FF0011',
    text: '#1F2937',
    icon: '⚠',
    name: 'Hard/Difficult'
  },
  MANS: {
    color: '#6F00FF',
    text: '#FFFFFF',
    icon: '⇈',
    name: 'Manitou Service'
  },
  UPDWN: {
    color: '#00C9CC',
    text: '#1F2937',
    icon: '⇅',
    name: 'Up & Down'
  },
  UNITUP: {
    color: '#33FCFF',
    text: '#1F2937',
    icon: '⇡',
    name: 'Unit Up'
  },
  UNITDWN: {
    color: '#6F00FF',
    text: '#FFFFFF',
    icon: '↓',
    name: 'Unit Down'
  },
  HAND: {
    color: '#EE00FF',
    text: '#FFFFFF',
    icon: '→',
    name: 'Hand Unload'
  },
  CRANE: {
    color: '#FF0090',
    text: '#FFFFFF',
    icon: '⇑',
    name: 'Crane Delivery'
  },
  BOAT: {
    color: '#0008FF',
    text: '#FFFFFF',
    icon: '⩯',
    name: 'Boat/Barge'
  },
  LATE: {
    color: '#94A3B8',
    text: '#1F2937',
    icon: '🌛',
    name: 'Late Delivery'
  }
};

export const STATUS_OVERRIDES = {
  DELIVERED: {
    color: '#25A01C',
    text: '#FFFFFF',
    icon: '✓',
    name: 'Completed'
  },
  RETURNED: {
    color: '#000000',
    text: '#FFFFFF',
    icon: '↩',
    name: 'Returned'
  }
};

/**
 * Convert hex color to RGB components
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

/**
 * Get styles for a job card based on delivery type and job status
 * Returns color, text color, icon, and name
 */
export const getJobCardStyles = (deliveryType, job) => {
  // Priority 1: Check if job is returned
  if (job?.isReturned) {
    return STATUS_OVERRIDES.RETURNED;
  }

  // Priority 2: Check if job is delivered/completed
  if (job?.status === 'DELIVERED') {
    return STATUS_OVERRIDES.DELIVERED;
  }

  // Priority 3: Check delivery type code
  const code = deliveryType?.code?.toUpperCase();
  if (code && DELIVERY_TYPE_STYLES[code]) {
    return DELIVERY_TYPE_STYLES[code];
  }

  // Default fallback
  return {
    color: '#E5E7EB',
    text: '#1F2937',
    icon: '',
    name: deliveryType?.name || 'Standard'
  };
};

/**
 * Get inline styles for a job card with tinted background
 * @param {Object} deliveryType 
 * @param {Object} job 
 * @returns {Object} Inline style object for the card
 */
export const getJobCardInlineStyles = (deliveryType, job) => {
  const styles = getJobCardStyles(deliveryType, job);
  const rgb = hexToRgb(styles.color);
  
  if (!rgb) {
    return {
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      '--card-color': '#E5E7EB'
    };
  }

  return {
    borderColor: styles.color,
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`,
    '--card-color': styles.color,
    '--card-color-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`
  };
};

/**
 * Get badge styles for delivery type code
 * @param {Object} styles - Result from getJobCardStyles
 * @returns {Object} Inline style object for the badge
 */
export const getBadgeStyles = (styles) => {
  return {
    backgroundColor: styles.color,
    color: styles.text,
    borderColor: styles.color
  };
};