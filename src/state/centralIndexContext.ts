import * as React from "react";

/** Default central index context object */
const defaultCentralIndex = {
  circular: 0,
  linear: 0,
  setCentralIndex: (_type: "LINEAR" | "CIRCULAR", _value: number) => {
    // noop
    void _type;
    void _value;
  },
};

/** The "central index" is used to scroll the linear or circular viewer when you click on an annotation */
const CentralIndexContext = React.createContext(defaultCentralIndex);
CentralIndexContext.displayName = "CentralIndexContext";

export default CentralIndexContext;
