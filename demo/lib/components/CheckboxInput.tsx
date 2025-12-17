import * as React from "react";

interface CheckboxInputProps {
  checked: boolean;
  label: string;
  set: (value: boolean) => void;
}

const CheckboxInput = ({ checked, label, set }: CheckboxInputProps) => (
  <label className="option checkbox-option">
    <input checked={checked} type="checkbox" onChange={e => set(e.target.checked)} />
    <span>{label}</span>
  </label>
);

export default CheckboxInput;
