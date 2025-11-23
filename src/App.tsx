import { MantineProvider } from '@mantine/core';
import { Canvas } from './widgets/canvas';
import '@mantine/core/styles.css';

function App() {
  return (
    <MantineProvider>
      <Canvas />
    </MantineProvider>
  );
}

export default App;
