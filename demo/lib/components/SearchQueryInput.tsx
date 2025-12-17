import * as React from "react";

interface SearchQueryInputProps {
  setQuery: (query: string) => void;
  value: string;
}

const SearchQueryInput = ({ setQuery, value }: SearchQueryInputProps) => (
  <label className="option" id="options-search">
    <span>Search</span>
    <input placeholder="Search..." type="text" value={value} onChange={e => setQuery(e.target.value)} />
  </label>
);

export default SearchQueryInput;
