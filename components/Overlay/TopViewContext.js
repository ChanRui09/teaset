// TopViewContext.js
import React from 'react';

const TopViewContext = React.createContext({
  registerTopViewHandler: null,
  unregisterTopViewHandler: null,
});

export default TopViewContext;
