"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function TermsPage() {
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
          <FileText className="text-brand-400" size={32} />
          <h1 className="text-3xl font-bold text-surface-100">
            {isIt ? "Termini di Servizio" : "Terms of Service"}
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
              {isIt ? "1. Accettazione dei Termini" : "1. Acceptance of Terms"}
            </h2>
            <p>
              {isIt
                ? "Accedendo e utilizzando la piattaforma FAL Trading (\"la Piattaforma\"), accetti di essere vincolato dai presenti Termini di Servizio. Se non accetti questi termini, non puoi utilizzare la Piattaforma. Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. L'uso continuato della Piattaforma dopo le modifiche costituisce accettazione dei termini aggiornati."
                : "By accessing and using the FAL Trading platform (\"the Platform\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform. We reserve the right to modify these terms at any time. Continued use of the Platform after modifications constitutes acceptance of the updated terms."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "2. Descrizione del Servizio" : "2. Service Description"}
            </h2>
            <p>
              {isIt
                ? "FAL Trading e' una piattaforma di trading che fornisce i seguenti servizi ai propri utenti:"
                : "FAL Trading is a trading platform that provides the following services to its users:"}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>
                {isIt
                  ? "Chat di gruppo e messaggistica in tempo reale tra trader"
                  : "Group chat and real-time messaging between traders"}
              </li>
              <li>
                {isIt
                  ? "Videochiamate e comunicazione vocale"
                  : "Video calls and voice communication"}
              </li>
              <li>
                {isIt
                  ? "Journal di trading per il monitoraggio e l'analisi delle operazioni"
                  : "Trading journal for tracking and analyzing trades"}
              </li>
              <li>
                {isIt
                  ? "Calendario per la pianificazione di eventi e sessioni di trading"
                  : "Calendar for scheduling events and trading sessions"}
              </li>
              <li>
                {isIt
                  ? "Galleria per la condivisione di screenshot e analisi grafiche"
                  : "Gallery for sharing screenshots and chart analysis"}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "3. Account Utente" : "3. User Accounts"}
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Registrazione:" : "Registration:"}
                </span>{" "}
                {isIt
                  ? "per utilizzare la Piattaforma e' necessario creare un account fornendo informazioni accurate e complete. Sei responsabile del mantenimento dell'accuratezza dei tuoi dati."
                  : "to use the Platform you must create an account by providing accurate and complete information. You are responsible for maintaining the accuracy of your data."}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Requisito di eta':" : "Age requirement:"}
                </span>{" "}
                {isIt
                  ? "devi avere almeno 18 anni per registrarti e utilizzare la Piattaforma. Registrandoti, dichiari e garantisci di avere almeno 18 anni."
                  : "you must be at least 18 years old to register and use the Platform. By registering, you represent and warrant that you are at least 18 years of age."}
              </li>
              <li>
                <span className="font-medium text-surface-200">
                  {isIt ? "Sicurezza dell'account:" : "Account security:"}
                </span>{" "}
                {isIt
                  ? "sei responsabile della salvaguardia della tua password e di tutte le attivita' che si verificano sotto il tuo account. Devi informarci immediatamente di qualsiasi uso non autorizzato del tuo account."
                  : "you are responsible for safeguarding your password and all activities that occur under your account. You must notify us immediately of any unauthorized use of your account."}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "4. Uso Accettabile" : "4. Acceptable Use"}
            </h2>
            <p className="mb-3">
              {isIt
                ? "Nell'utilizzo della Piattaforma, accetti di NON:"
                : "When using the Platform, you agree NOT to:"}
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                {isIt
                  ? "Svolgere attivita' illegali o promuovere attivita' illecite di qualsiasi tipo"
                  : "Engage in illegal activities or promote unlawful activities of any kind"}
              </li>
              <li>
                {isIt
                  ? "Molestare, intimidire, minacciare o abusare di altri utenti della Piattaforma"
                  : "Harass, bully, threaten, or abuse other users of the Platform"}
              </li>
              <li>
                {isIt
                  ? "Effettuare scraping, raccolta automatizzata o estrazione di dati dalla Piattaforma senza esplicita autorizzazione scritta"
                  : "Scrape, automatically collect, or extract data from the Platform without explicit written authorization"}
              </li>
              <li>
                {isIt
                  ? "Decompilare, disassemblare o tentare di effettuare il reverse engineering di qualsiasi parte della Piattaforma"
                  : "Decompile, disassemble, or attempt to reverse engineer any part of the Platform"}
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "5. Proprieta' Intellettuale" : "5. Intellectual Property"}
            </h2>
            <p>
              {isIt
                ? "Tutti i contenuti, le funzionalita' e le caratteristiche della Piattaforma, inclusi ma non limitati a testo, grafica, loghi, icone, immagini, codice software e la compilazione degli stessi, sono di proprieta' esclusiva di FAL Trading o dei suoi licenzianti e sono protetti dalle leggi internazionali sul copyright, sui marchi e sulla proprieta' intellettuale. L'uso non autorizzato di qualsiasi materiale presente sulla Piattaforma e' severamente vietato."
                : "All content, features, and functionality of the Platform, including but not limited to text, graphics, logos, icons, images, software code, and the compilation thereof, are the exclusive property of FAL Trading or its licensors and are protected by international copyright, trademark, and intellectual property laws. Unauthorized use of any material on the Platform is strictly prohibited."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "6. Disclaimer sul Trading" : "6. Trading Disclaimer"}
            </h2>
            <div className="p-4 bg-warning-500/10 border border-warning-500/20 rounded-lg">
              <p className="text-warning-400 font-medium mb-2">
                {isIt ? "AVVERTENZA IMPORTANTE" : "IMPORTANT WARNING"}
              </p>
              <p>
                {isIt
                  ? "FAL Trading NON fornisce consulenza finanziaria, di investimento o di trading. Tutti i contenuti e le funzionalita' della Piattaforma sono forniti esclusivamente a scopo informativo ed educativo. Il trading di strumenti finanziari comporta un alto livello di rischio e potrebbe non essere adatto a tutti gli investitori. Potresti perdere parte o tutto il capitale investito. Dovresti considerare attentamente i tuoi obiettivi di investimento, il livello di esperienza e la propensione al rischio prima di operare. L'uso della Piattaforma e' interamente a tuo rischio e pericolo."
                  : "FAL Trading does NOT provide financial, investment, or trading advice. All content and features of the Platform are provided for informational and educational purposes only. Trading financial instruments carries a high level of risk and may not be suitable for all investors. You may lose some or all of your invested capital. You should carefully consider your investment objectives, level of experience, and risk appetite before trading. Use of the Platform is entirely at your own risk."}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "7. Limitazione di Responsabilita'" : "7. Limitation of Liability"}
            </h2>
            <p>
              {isIt
                ? "Nella misura massima consentita dalla legge applicabile, FAL Trading e i suoi dirigenti, dipendenti, agenti e affiliati non saranno responsabili per danni indiretti, incidentali, speciali, consequenziali o punitivi, inclusi ma non limitati a perdita di profitti, dati, uso, avviamento o altre perdite intangibili, derivanti dall'uso o dall'impossibilita' di utilizzare la Piattaforma, da qualsiasi contenuto ottenuto dalla Piattaforma, o da accesso non autorizzato ai tuoi dati o dalla loro alterazione."
                : "To the maximum extent permitted by applicable law, FAL Trading and its officers, employees, agents, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from your use or inability to use the Platform, any content obtained from the Platform, or unauthorized access to or alteration of your data."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "8. Risoluzione" : "8. Termination"}
            </h2>
            <p>
              {isIt
                ? "Ci riserviamo il diritto di sospendere o terminare il tuo account e l'accesso alla Piattaforma in qualsiasi momento, con o senza preavviso, per qualsiasi motivo, incluso ma non limitato alla violazione dei presenti Termini di Servizio. In caso di risoluzione, il tuo diritto di utilizzare la Piattaforma cessera' immediatamente. Puoi anche richiedere la cancellazione del tuo account in qualsiasi momento contattando il nostro supporto o tramite le impostazioni del profilo."
                : "We reserve the right to suspend or terminate your account and access to the Platform at any time, with or without notice, for any reason, including but not limited to violation of these Terms of Service. Upon termination, your right to use the Platform will cease immediately. You may also request the deletion of your account at any time by contacting our support or through profile settings."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "9. Legge Applicabile" : "9. Governing Law"}
            </h2>
            <p>
              {isIt
                ? "I presenti Termini di Servizio sono regolati e interpretati in conformita' con le leggi della Repubblica Italiana e le normative dell'Unione Europea applicabili, incluso il Regolamento Generale sulla Protezione dei Dati (GDPR). Qualsiasi controversia derivante da o relativa ai presenti termini sara' sottoposta alla giurisdizione esclusiva dei tribunali italiani competenti."
                : "These Terms of Service shall be governed by and construed in accordance with the laws of the Italian Republic and applicable European Union regulations, including the General Data Protection Regulation (GDPR). Any disputes arising out of or relating to these terms shall be subject to the exclusive jurisdiction of the competent Italian courts."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-brand-400 mb-4">
              {isIt ? "10. Contatti" : "10. Contact"}
            </h2>
            <p>
              {isIt
                ? "Per qualsiasi domanda relativa ai presenti Termini di Servizio, puoi contattarci ai seguenti recapiti:"
                : "For any questions regarding these Terms of Service, you can contact us at:"}
            </p>
            <div className="mt-3 p-4 bg-surface-900 rounded-lg border border-surface-700">
              <p className="text-surface-200 font-medium">FAL Trading</p>
              <p className="text-brand-400">dpo@faltrading.com</p>
            </div>
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
