import * as React from "react";

import { VIEWER_TYPE_OPTIONS, type ViewerOption } from "../constants";

type ViewerTypeOption = (typeof VIEWER_TYPE_OPTIONS)[number];

interface ViewerTypeInputProps {
  setType: (viewType: ViewerOption) => void;
  value: ViewerOption;
  options?: ReadonlyArray<ViewerTypeOption>;
}

const ViewerTypeInput = ({ options = VIEWER_TYPE_OPTIONS, setType, value }: ViewerTypeInputProps) => (
  <label className="option" id="topology">
    <span>Topology</span>
    <select value={value} onChange={e => setType(e.target.value as ViewerOption)}>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </select>
  </label>
);

export default ViewerTypeInput;
