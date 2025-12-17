import * as React from "react";

interface LinearZoomInputProps {
  setZoom: (zoom: number) => void;
  value: number;
}

const LinearZoomInput = ({ setZoom, value }: LinearZoomInputProps) => (
  <label className="option" id="zoom">
    <span>Zoom</span>
    <div className="slider-input">
      <input
        className="slider"
        max={100}
        min={1}
        type="range"
        value={value}
        onChange={e => {
          setZoom(parseInt(e.target.value, 10));
        }}
      />
      <span className="slider-value">{value}</span>
    </div>
  </label>
);

export default LinearZoomInput;
