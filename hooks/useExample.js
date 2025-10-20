import { useState } from 'react';

const useExample = () => {
  const [state, setState] = useState(null);

  return { state, setState };
};

export default useExample;
