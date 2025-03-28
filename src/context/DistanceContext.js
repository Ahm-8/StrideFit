import React, { createContext, useState } from 'react';

export const DistanceContext = createContext();

export const DistanceProvider = ({ children }) => {
  const [distanceGoal, setDistanceGoal] = useState(5); // Default goal in KM

  return (
    <DistanceContext.Provider value={{ distanceGoal, setDistanceGoal }}>
      {children}
    </DistanceContext.Provider>
  );
}; 