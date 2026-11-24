import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Docs } from './pages/Docs';
import { Guide } from './pages/Guide';
import { Home } from './pages/Home';
import { JobDetail } from './pages/JobDetail';
import { Jobs } from './pages/Jobs';
import { New } from './pages/New';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="new" element={<New />} />
          <Route path="guide" element={<Guide />} />
          <Route path="docs" element={<Docs />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
