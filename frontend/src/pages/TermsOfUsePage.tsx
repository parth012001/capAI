import LegalPageLayout from '../components/legal/LegalPageLayout';
import termsHTML from '../assets/legal/terms-of-use.html?raw';
import '../components/legal/legal-content.css';

export default function TermsOfUsePage() {
  return (
    <LegalPageLayout
      content={termsHTML}
      className="legal-content"
    />
  );
}
