import * as React from "react";

interface CircularZoomInputProps {
  setZoom: (zoom: number) => void;
  value: number;
}

const CircularZoomInput = ({ setZoom, value }: CircularZoomInputProps) => (
  <label className="option" id="circular-zoom">
    <span>Circular Map Zoom</span>
    <div className="slider-input">
      <input
        className="slider"
        max={100}
        min={0}
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

export default CircularZoomInput;
