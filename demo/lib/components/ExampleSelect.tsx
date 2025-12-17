import * as React from "react";

import { DEMO_EXAMPLE_OPTIONS, type DemoExampleId } from "../constants";

interface ExampleSelectProps {
  onChange: (id: DemoExampleId) => void;
  value: DemoExampleId;
}

const ExampleSelect = ({ onChange, value }: ExampleSelectProps) => {
  const selectedOption = DEMO_EXAMPLE_OPTIONS.find(option => option.id === value);

  return (
    <label className="option" id="dataset-preset">
      <span>Dataset preset</span>
      <select value={value} onChange={event => onChange(event.target.value as DemoExampleId)}>
        {DEMO_EXAMPLE_OPTIONS.map(option => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {selectedOption?.description ? (
        <small className="option-description">{selectedOption.description}</small>
      ) : null}
    </label>
  );
};

export default ExampleSelect;
