// Configuration Constants

export const CONFIG_GROUPS = [
  { value: 'location', label: 'Location' },
  { value: 'service', label: 'Service Types' }
];

export const CONFIG_GROUP_VALUES = CONFIG_GROUPS.map(group => group.value);

// Default values
export const DEFAULT_CONFIG_STATUS = true; // Always active
export const DEFAULT_CONFIG_ORDER = 1;
