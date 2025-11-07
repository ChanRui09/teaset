// StatusBarConfigContext.js

'use strict';

import React from 'react';

const StatusBarConfigContext = React.createContext({
  setStatusBarConfig: () => false,
  getStatusBarConfig: () => null,
});

export default StatusBarConfigContext;
