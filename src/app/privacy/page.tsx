"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function PrivacyPage() {
  const { locale } = useI18n();
  const isIt = locale === "it";

  return (
    <div className="min-h-screen bg-surface-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm mb-8"
        >
          <ArrowLeft size={16} />
          {isIt ? "Torna alla registrazione" : "Back to registration"}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-brand-400" size={32} />
          <h1 className="text-3xl font-bold text-surface-100">
            {isIt ? "Informativa sulla Privacy" : "Privacy Policy"}
          </h1>
        </div>

        <p className="text-surface-400 text-sm mb-10">
          {isIt
            ? "Ultimo aggiornamento: Febbraio 2025"
            : "Last updated: February 2025"}
        </p>

        <div className="space-y-10 text-surface-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "1. Titolare del Trattamento" : "1. Data Controller"}
            </h2>
            <p>
              {isIt
                ? "Il titolare del trattamento dei dati personali e' FAL Trading (\"noi\", \"nostro\", \"la Piattaforma\"). Per qualsiasi questione relativa alla protezione dei dati, e' possibile contattare il nostro Responsabile della Protezione dei Dati (DPO) all'indirizzo:"
                : "The data controller for your personal data is FAL Trading (\"we\", \"us\", \"the Platform\"). For any data protection matters, you can contact our Data Protection Officer (DPO) at:"}
            </p>
            <p className="mt-2 text-brand-400 font-medium">dpo@faltrading.com</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "2. Dati Raccolti" : "2. Data Collected"}
            </h2>
            <p className="mb-3">
              {isIt
                ? "Raccogliamo e trattiamo le seguenti categorie di dati personali:"
                : "We collect and process the following categories of personal data:"}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Dati del profilo:" : "Profile data:"}
                </span>{" "}
                {isIt
                  ? "nome utente, email, nome, cognome, numero di telefono, data di nascita, avatar, biografia"
                  : "username, email, first name, last name, phone number, date of birth, avatar, biography"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Dati di trading:" : "Trading data:"}
                </span>{" "}
                {isIt
                  ? "voci del journal di trading, conti di trading collegati, metriche di performance, dati MetaApi"
                  : "trading journal entries, linked trading accounts, performance metrics, MetaApi data"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Dati della chat:" : "Chat data:"}
                </span>{" "}
                {isIt
                  ? "messaggi nelle stanze di chat, contenuti multimediali condivisi, timestamp"
                  : "messages in chat rooms, shared media content, timestamps"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Dati delle chiamate:" : "Call data:"}
                </span>{" "}
                {isIt
                  ? "registri delle videochiamate, durata, partecipanti (tramite Jitsi Meet)"
                  : "video call logs, duration, participants (via Jitsi Meet)"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Dati di pagamento:" : "Payment data:"}
                </span>{" "}
                {isIt
                  ? "cronologia delle transazioni, informazioni sull'abbonamento, registri di fatturazione"
                  : "transaction history, subscription information, billing records"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Dati del calendario:" : "Calendar data:"}
                </span>{" "}
                {isIt
                  ? "eventi pianificati, promemoria, note associate"
                  : "scheduled events, reminders, associated notes"}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "3. Base Giuridica del Trattamento" : "3. Legal Basis for Processing"}
            </h2>
            <p className="mb-3">
              {isIt
                ? "Trattiamo i tuoi dati personali sulla base delle seguenti basi giuridiche ai sensi del GDPR:"
                : "We process your personal data based on the following legal grounds under the GDPR:"}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Consenso (Art. 6(1)(a) GDPR):" : "Consent (Art. 6(1)(a) GDPR):"}
                </span>{" "}
                {isIt
                  ? "per comunicazioni di marketing, cookie non essenziali e condivisione di dati con terze parti"
                  : "for marketing communications, non-essential cookies, and third-party data sharing"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt
                    ? "Esecuzione contrattuale (Art. 6(1)(b) GDPR):"
                    : "Contract performance (Art. 6(1)(b) GDPR):"}
                </span>{" "}
                {isIt
                  ? "per fornire i servizi della piattaforma, gestire il tuo account e elaborare i pagamenti"
                  : "to provide platform services, manage your account, and process payments"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt
                    ? "Interesse legittimo (Art. 6(1)(f) GDPR):"
                    : "Legitimate interest (Art. 6(1)(f) GDPR):"}
                </span>{" "}
                {isIt
                  ? "per la sicurezza della piattaforma, prevenzione delle frodi, analisi aggregate e miglioramento del servizio"
                  : "for platform security, fraud prevention, aggregate analytics, and service improvement"}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "4. Conservazione dei Dati" : "4. Data Retention"}
            </h2>
            <p className="mb-3">
              {isIt
                ? "Conserviamo i tuoi dati personali per i seguenti periodi:"
                : "We retain your personal data for the following periods:"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="text-left py-2 pr-4 text-surface-200 font-medium">
                      {isIt ? "Tipo di Dato" : "Data Type"}
                    </th>
                    <th className="text-left py-2 text-surface-200 font-medium">
                      {isIt ? "Periodo di Conservazione" : "Retention Period"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  <tr>
                    <td className="py-2 pr-4">{isIt ? "Dati del profilo" : "Profile data"}</td>
                    <td className="py-2">
                      {isIt
                        ? "Durata dell'account + 30 giorni"
                        : "Account duration + 30 days"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">{isIt ? "Dati di trading" : "Trading data"}</td>
                    <td className="py-2">
                      {isIt ? "Durata dell'account" : "Account duration"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">{isIt ? "Dati della chat" : "Chat data"}</td>
                    <td className="py-2">
                      {isIt ? "Durata dell'account" : "Account duration"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">{isIt ? "Dati delle chiamate" : "Call data"}</td>
                    <td className="py-2">{isIt ? "90 giorni" : "90 days"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">{isIt ? "Dati di pagamento" : "Payment data"}</td>
                    <td className="py-2">
                      {isIt ? "10 anni (obbligo di legge)" : "10 years (legal obligation)"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">{isIt ? "Log di sistema" : "System logs"}</td>
                    <td className="py-2">{isIt ? "12 mesi" : "12 months"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "5. Diritti dell'Utente" : "5. User Rights"}
            </h2>
            <p className="mb-3">
              {isIt
                ? "Ai sensi del GDPR, hai i seguenti diritti riguardo ai tuoi dati personali:"
                : "Under the GDPR, you have the following rights regarding your personal data:"}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Diritto di accesso (Art. 15):" : "Right of access (Art. 15):"}
                </span>{" "}
                {isIt
                  ? "puoi richiedere una copia dei tuoi dati personali in nostro possesso"
                  : "you can request a copy of your personal data we hold"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Diritto di rettifica (Art. 16):" : "Right to rectification (Art. 16):"}
                </span>{" "}
                {isIt
                  ? "puoi richiedere la correzione di dati inesatti o incompleti"
                  : "you can request correction of inaccurate or incomplete data"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt
                    ? "Diritto alla cancellazione (Art. 17):"
                    : "Right to erasure (Art. 17):"}
                </span>{" "}
                {isIt
                  ? "puoi richiedere la cancellazione dei tuoi dati personali (\"diritto all'oblio\")"
                  : "you can request deletion of your personal data (\"right to be forgotten\")"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt
                    ? "Diritto alla portabilita' (Art. 20):"
                    : "Right to data portability (Art. 20):"}
                </span>{" "}
                {isIt
                  ? "puoi richiedere i tuoi dati in un formato strutturato, di uso comune e leggibile da dispositivo automatico"
                  : "you can request your data in a structured, commonly used, and machine-readable format"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt
                    ? "Diritto di opposizione e limitazione (Art. 18, 21):"
                    : "Right to object and restrict (Art. 18, 21):"}
                </span>{" "}
                {isIt
                  ? "puoi opporti al trattamento o richiederne la limitazione in determinate circostanze"
                  : "you can object to processing or request its restriction in certain circumstances"}
              </li>
            </ul>
            <p className="mt-3">
              {isIt
                ? "Per esercitare i tuoi diritti, contatta il nostro DPO all'indirizzo dpo@faltrading.com. Risponderemo entro 30 giorni."
                : "To exercise your rights, contact our DPO at dpo@faltrading.com. We will respond within 30 days."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "6. Sub-responsabili del Trattamento" : "6. Sub-processors"}
            </h2>
            <p className="mb-3">
              {isIt
                ? "Utilizziamo i seguenti sub-responsabili per il trattamento dei dati:"
                : "We use the following sub-processors for data processing:"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-surface-700">
                    <th className="text-left py-2 pr-4 text-surface-200 font-medium">
                      {isIt ? "Sub-responsabile" : "Sub-processor"}
                    </th>
                    <th className="text-left py-2 pr-4 text-surface-200 font-medium">
                      {isIt ? "Infrastruttura" : "Infrastructure"}
                    </th>
                    <th className="text-left py-2 text-surface-200 font-medium">
                      {isIt ? "Scopo" : "Purpose"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  <tr>
                    <td className="py-2 pr-4">Supabase / AWS</td>
                    <td className="py-2 pr-4">
                      {isIt ? "Cloud (UE/USA)" : "Cloud (EU/US)"}
                    </td>
                    <td className="py-2">
                      {isIt
                        ? "Database, autenticazione, archiviazione file"
                        : "Database, authentication, file storage"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">MetaApi</td>
                    <td className="py-2 pr-4">
                      {isIt ? "Cloud (USA)" : "Cloud (US)"}
                    </td>
                    <td className="py-2">
                      {isIt
                        ? "Collegamento conti di trading, sincronizzazione dati di mercato"
                        : "Trading account linking, market data synchronization"}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Jitsi Meet</td>
                    <td className="py-2 pr-4">
                      {isIt ? "Self-hosted / Cloud" : "Self-hosted / Cloud"}
                    </td>
                    <td className="py-2">
                      {isIt
                        ? "Videochiamate e comunicazione in tempo reale"
                        : "Video calls and real-time communication"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "7. Cookie e Archiviazione Locale" : "7. Cookies and Local Storage"}
            </h2>
            <p>
              {isIt
                ? "La nostra piattaforma utilizza esclusivamente cookie tecnici e localStorage per il funzionamento essenziale del servizio. Non utilizziamo cookie di profilazione o di terze parti per finalita' di marketing."
                : "Our platform uses only technical cookies and localStorage for essential service operation. We do not use profiling or third-party cookies for marketing purposes."}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>
                <span className="font-medium text-surface-200">localStorage - fal_token:</span>{" "}
                {isIt
                  ? "token JWT per l'autenticazione della sessione"
                  : "JWT token for session authentication"}
              </li>
              <li>
                <span className="font-medium text-surface-200">localStorage - fal_locale:</span>{" "}
                {isIt
                  ? "preferenza della lingua dell'utente (en/it)"
                  : "user language preference (en/it)"}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Cookie tecnici:" : "Technical cookies:"}
                </span>{" "}
                {isIt
                  ? "solo cookie strettamente necessari per il funzionamento della piattaforma"
                  : "strictly necessary cookies only for platform operation"}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "8. Trasferimenti Internazionali di Dati" : "8. International Data Transfers"}
            </h2>
            <p>
              {isIt
                ? "I tuoi dati possono essere trasferiti e trattati in paesi al di fuori dello Spazio Economico Europeo (SEE), in particolare attraverso i nostri sub-responsabili AWS e MetaApi con sede negli Stati Uniti. Tali trasferimenti sono regolati dalle Clausole Contrattuali Standard (SCC) della Commissione Europea ai sensi dell'Art. 46(2)(c) del GDPR, garantendo un livello adeguato di protezione dei dati."
                : "Your data may be transferred to and processed in countries outside the European Economic Area (EEA), particularly through our sub-processors AWS and MetaApi based in the United States. Such transfers are governed by the European Commission's Standard Contractual Clauses (SCCs) under Art. 46(2)(c) GDPR, ensuring an adequate level of data protection."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "9. Sicurezza dei Dati" : "9. Data Security"}
            </h2>
            <p className="mb-3">
              {isIt
                ? "Implementiamo misure tecniche e organizzative appropriate per proteggere i tuoi dati personali:"
                : "We implement appropriate technical and organizational measures to protect your personal data:"}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                {isIt
                  ? "Crittografia TLS per tutti i dati in transito"
                  : "TLS encryption for all data in transit"}
              </li>
              <li>
                {isIt
                  ? "Crittografia a riposo per tutti i dati archiviati"
                  : "Encryption at rest for all stored data"}
              </li>
              <li>
                {isIt
                  ? "Hashing delle password con algoritmi sicuri (bcrypt)"
                  : "Password hashing with secure algorithms (bcrypt)"}
              </li>
              <li>
                {isIt
                  ? "Autenticazione basata su JWT con scadenza dei token"
                  : "JWT-based authentication with token expiration"}
              </li>
              <li>
                {isIt
                  ? "Controllo degli accessi basato sui ruoli (RBAC) con separazione dei privilegi utente/amministratore"
                  : "Role-based access control (RBAC) with user/admin privilege separation"}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "10. Contatto DPO" : "10. DPO Contact"}
            </h2>
            <p>
              {isIt
                ? "Per qualsiasi domanda relativa al trattamento dei tuoi dati personali, per esercitare i tuoi diritti o per presentare un reclamo, puoi contattare il nostro Responsabile della Protezione dei Dati:"
                : "For any questions regarding the processing of your personal data, to exercise your rights, or to file a complaint, you can contact our Data Protection Officer:"}
            </p>
            <div className="mt-3 p-4 bg-surface-900 rounded-lg border border-surface-700">
              <p className="text-surface-200 font-medium">
                {isIt ? "Responsabile della Protezione dei Dati" : "Data Protection Officer"}
              </p>
              <p className="text-surface-300">FAL Trading</p>
              <p className="text-brand-400">dpo@faltrading.com</p>
            </div>
            <p className="mt-3">
              {isIt
                ? "Hai inoltre il diritto di presentare un reclamo all'autorita' di controllo competente (Garante per la protezione dei dati personali in Italia)."
                : "You also have the right to lodge a complaint with the competent supervisory authority (Garante per la protezione dei dati personali in Italy)."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "11. Modifiche alla Policy" : "11. Changes to This Policy"}
            </h2>
            <p>
              {isIt
                ? "Ci riserviamo il diritto di aggiornare questa informativa sulla privacy in qualsiasi momento. Le modifiche significative saranno comunicate tramite notifica sulla piattaforma o via email. L'uso continuato della piattaforma dopo le modifiche costituisce accettazione della nuova informativa. Ti invitiamo a consultare periodicamente questa pagina per eventuali aggiornamenti."
                : "We reserve the right to update this privacy policy at any time. Significant changes will be communicated via platform notification or email. Continued use of the platform after changes constitutes acceptance of the new policy. We encourage you to review this page periodically for updates."}
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-surface-800">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 text-sm"
          >
            <ArrowLeft size={16} />
            {isIt ? "Torna alla registrazione" : "Back to registration"}
          </Link>
        </div>
      </div>
    </div>
  );
}
