import LegalPageLayout from '../components/legal/LegalPageLayout';
import privacyHTML from '../assets/legal/privacy-policy.html?raw';
import '../components/legal/legal-content.css';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      content={privacyHTML}
      className="legal-content"
    />
  );
}
