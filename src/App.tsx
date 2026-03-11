import { BrowserRouter, Routes, Route } from "react-router";
import { SettingsProvider } from "./contexts/SettingsContext";
import { Layout } from "./components/Layout";
import HomePage from "./pages/HomePage";
import PracticePage from "./pages/PracticePage";

function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="practice/:hash" element={<PracticePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  );
}

export default App;
