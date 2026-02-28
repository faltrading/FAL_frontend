//+------------------------------------------------------------------+
//|                                              FAL_Journal.mq4      |
//|                         FAL Trading Journal — EA per MT4          |
//|                                                                    |
//|  INSTALLAZIONE:                                                    |
//|  1. Copia questo file in: MetaTrader4/MQL4/Experts/               |
//|  2. Compila (F7) nell'editor MetaEditor                           |
//|  3. Trascina l'EA su qualsiasi grafico                            |
//|  4. Vai su Strumenti > Opzioni > Expert Advisor                    |
//|     → Abilita "Consenti WebRequest" per il tuo gateway URL         |
//|  5. IMPORTANTE: nel tab "Storico Conto" (Account History)          |
//|     tasto destro → "Tutta la cronologia" (All History)             |
//|     altrimenti l'EA vedrà solo i trade del periodo selezionato     |
//+------------------------------------------------------------------+
#property copyright "FAL Trading Journal"
#property link      "https://faltrading.com"
#property version   "1.10"
#property strict

input string ServerURL   = "%%GATEWAY_URL%%/api/v1/broker/ea/push";
input string EAToken     = "%%EA_TOKEN%%";  // Token generato su FAL Trading Journal
input int    SyncSeconds = 60;              // Intervallo sincronizzazione (secondi)

string SENT_FILE;
bool   g_firstSync = true;
int    g_lastHistoryTotal = 0;

//+------------------------------------------------------------------+
int OnInit()
{
    SENT_FILE = "fal_sent_" + StringSubstr(EAToken, 0, 8) + ".txt";

    if (StringLen(EAToken) < 10 || StringFind(EAToken, "%%") >= 0) {
        Alert("FAL Journal: Token EA non configurato!\n"
              "Scarica di nuovo il file da FAL Trading Journal.");
        return INIT_PARAMETERS_INCORRECT;
    }

    if (StringFind(ServerURL, "%%") >= 0) {
        Alert("FAL Journal: URL del server non configurato!");
        return INIT_PARAMETERS_INCORRECT;
    }

    Print("========================================================");
    Print("FAL Journal v1.1 — avvio");
    Print("  Account : ", AccountNumber());
    Print("  Token   : ", StringSubstr(EAToken, 0, 8), "...");
    Print("  Server  : ", ServerURL);
    Print("  Sync    : ogni ", SyncSeconds, " secondi");
    Print("========================================================");

    // Prima sync dopo 3 secondi — dà tempo al terminale di caricare
    // lo storico completo dal server prima di tentare l'invio.
    g_firstSync = true;
    EventSetTimer(3);
    Comment("FAL Journal: avvio — prima sincronizzazione tra 3s...");

    return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
    EventKillTimer();
    Comment("");
}

//+------------------------------------------------------------------+
void OnTimer()
{
    if (g_firstSync) {
        g_firstSync = false;
        EventSetTimer(SyncSeconds); // Passa all'intervallo normale

        // [STEP 1] Test connessione
        Print("FAL Journal: [STEP 1/3] Test connessione al server...");
        int testCode = TestServerConnection();
        if (testCode < 0) {
            PrintConnectivityError();
            return;
        }
        Print("FAL Journal: [STEP 1/3] OK — server raggiungibile (HTTP ", testCode, ")");

        // [STEP 2] Carica storico
        Print("FAL Journal: [STEP 2/3] Caricamento storico ordini...");
    }

    // [STEP 3] Sincronizza
    SyncTrades();
    g_lastHistoryTotal = OrdersHistoryTotal();
}

//+------------------------------------------------------------------+
//  OnTick: rileva nuove chiusure tra un timer e l'altro
//+------------------------------------------------------------------+
void OnTick()
{
    int currentTotal = OrdersHistoryTotal();
    if (currentTotal != g_lastHistoryTotal) {
        g_lastHistoryTotal = currentTotal;
        Print("FAL Journal: Nuovo ordine chiuso rilevato — sync immediata");
        SyncTrades();
    }
}

//+------------------------------------------------------------------+
//  Test connessione al server
//+------------------------------------------------------------------+
int TestServerConnection()
{
    string testJson = "{\"token\":\"__connectivity_test__\","
                      "\"ticket\":0,\"symbol\":\"TEST\",\"type\":\"buy\","
                      "\"lots\":0,\"open_price\":0,\"close_price\":0,"
                      "\"open_time\":\"2000.01.01 00:00:00\","
                      "\"close_time\":\"2000.01.01 00:00:00\","
                      "\"profit\":0,\"commission\":0,\"swap\":0,"
                      "\"magic\":0,\"comment\":\"test\",\"platform\":\"mt4\"}";

    char postData[];
    StringToCharArray(testJson, postData, 0, StringLen(testJson));
    char serverResp[];
    string respHeaders;
    string reqHeaders = "Content-Type: application/json\r\n";

    ResetLastError();
    int httpCode = WebRequest("POST", ServerURL, reqHeaders, 10000, postData, serverResp, respHeaders);

    if (httpCode < 0) {
        int err = GetLastError();
        Print("FAL Journal: WebRequest FALLITO — httpCode=", httpCode, " errore_sistema=", err);
        return -1;
    }

    return httpCode;
}

void PrintConnectivityError()
{
    // Estrai URL base (solo dominio) per la whitelist
    string baseUrl = ServerURL;
    int pathPos = StringFind(ServerURL, "/", 8); // Salta "https://"
    if(pathPos > 0) baseUrl = StringSubstr(ServerURL, 0, pathPos);

    Print("FAL Journal: ========================================================");
    Print("FAL Journal: ERRORE CRITICO: WebRequest BLOCCATO!");
    Print("FAL Journal: ");
    Print("FAL Journal: Il server NON è raggiungibile. Devi abilitare WebRequest:");
    Print("FAL Journal: ");
    Print("FAL Journal:   1. Vai su: Strumenti > Opzioni > Expert Advisor");
    Print("FAL Journal:   2. Spunta 'Consenti WebRequest per URL elencati'");
    Print("FAL Journal:   3. Aggiungi questo URL (SOLO il dominio):");
    Print("FAL Journal:      ", baseUrl);
    Print("FAL Journal:   4. Premi OK e RIAVVIA METATRADER completamente");
    Print("FAL Journal:      (non basta riavviare solo l'EA!)");
    Print("FAL Journal: ");
    Print("FAL Journal: ========================================================");

    Alert("FAL Journal: ERRORE — WebRequest BLOCCATO!\n\n"
          "Devi abilitare WebRequest per questo URL:\n\n"
          "1. Strumenti > Opzioni > Expert Advisor\n"
          "2. Spunta 'Consenti WebRequest per URL elencati'\n"
          "3. Aggiungi (solo il dominio): " + baseUrl + "\n"
          "4. Premi OK e RIAVVIA METATRADER\n"
          "   (non basta riavviare solo l'EA!)");

    Comment("FAL Journal: ERRORE — WebRequest bloccato!\n"
            "Aggiungi " + baseUrl + " alla whitelist\n"
            "e RIAVVIA MetaTrader completamente");
}

//+------------------------------------------------------------------+
//  File helper: legge i ticket già inviati
//+------------------------------------------------------------------+
string ReadSentTickets()
{
    string data = ",";
    int h = FileOpen(SENT_FILE, FILE_READ | FILE_TXT | FILE_COMMON);
    if (h != INVALID_HANDLE) {
        while (!FileIsEnding(h))
            data += FileReadString(h);
        FileClose(h);
    }
    return data;
}

bool IsTicketSent(const string &sentData, int ticket)
{
    return StringFind(sentData, "," + IntegerToString(ticket) + ",") >= 0;
}

void MarkTicketSent(string &sentData, int ticket)
{
    string entry = IntegerToString(ticket) + ",";
    sentData += entry;
    int h = FileOpen(SENT_FILE, FILE_READ | FILE_WRITE | FILE_TXT | FILE_COMMON);
    if (h != INVALID_HANDLE) {
        FileSeek(h, 0, SEEK_END);
        FileWriteString(h, entry);
        FileClose(h);
    }
}

//+------------------------------------------------------------------+
//  Sincronizza i trade chiusi con il server FAL
//+------------------------------------------------------------------+
void SyncTrades()
{
    string sentData = ReadSentTickets();
    int total   = OrdersHistoryTotal();

    // ── Diagnostica: conta i deal per categoria ──
    int eligible     = 0;
    int skippedType  = 0;
    int alreadySent  = 0;
    int synced       = 0;
    int errors       = 0;

    Print("FAL Journal: [STEP 3/3] Storico caricato — ", total, " ordini totali");

    if (total == 0) {
        Print("FAL Journal: ZERO ordini nello storico!");
        Print("FAL Journal: Verifica che nel tab 'Storico Conto' di MetaTrader");
        Print("FAL Journal: sia selezionato 'Tutta la cronologia' (tasto destro > periodo)");
        Comment("FAL Journal: attivo — 0 ordini nello storico\n"
                "Verifica 'Tutta la cronologia' nel tab Storico Conto");
        return;
    }

    for (int i = 0; i < total; i++) {
        if (!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
        if (OrderType() != OP_BUY && OrderType() != OP_SELL) {
            skippedType++;
            continue;
        }

        eligible++;

        if (IsTicketSent(sentData, OrderTicket())) {
            alreadySent++;
            continue;
        }

        string side      = (OrderType() == OP_BUY) ? "buy" : "sell";
        string openTime  = TimeToString(OrderOpenTime(),  TIME_DATE | TIME_SECONDS);
        string closeTime = TimeToString(OrderCloseTime(), TIME_DATE | TIME_SECONDS);

        string comment = OrderComment();
        StringReplace(comment, "\"", "'");
        StringReplace(comment, "\\", "/");

        string json = StringFormat(
            "{"
            "\"token\":\"%s\","
            "\"ticket\":%d,"
            "\"symbol\":\"%s\","
            "\"type\":\"%s\","
            "\"lots\":%.2f,"
            "\"open_price\":%.5f,"
            "\"close_price\":%.5f,"
            "\"open_time\":\"%s\","
            "\"close_time\":\"%s\","
            "\"profit\":%.2f,"
            "\"commission\":%.2f,"
            "\"swap\":%.2f,"
            "\"magic\":%d,"
            "\"comment\":\"%s\","
            "\"platform\":\"mt4\""
            "}",
            EAToken,
            OrderTicket(),
            OrderSymbol(),
            side,
            OrderLots(),
            OrderOpenPrice(),
            OrderClosePrice(),
            openTime,
            closeTime,
            OrderProfit(),
            OrderCommission(),
            OrderSwap(),
            OrderMagicNumber(),
            comment
        );

        char postData[];
        StringToCharArray(json, postData, 0, StringLen(json));

        char    serverResp[];
        string  respHeaders;
        string  reqHeaders = "Content-Type: application/json\r\n";

        ResetLastError();
        int httpCode = WebRequest("POST", ServerURL, reqHeaders, 5000, postData, serverResp, respHeaders);

        if (httpCode == 200 || httpCode == 201) {
            MarkTicketSent(sentData, OrderTicket());
            synced++;
        } else if (httpCode < 0) {
            int err = GetLastError();
            Print("FAL Journal: WebRequest BLOCCATO per ticket ", OrderTicket(),
                  " — httpCode=", httpCode, " errore=", err);
            PrintConnectivityError();
            errors++;
            break;
        } else {
            string resp = CharArrayToString(serverResp);
            Print("FAL Journal: HTTP ", httpCode, " ticket ", OrderTicket(),
                  " symbol=", OrderSymbol(), " — ", resp);
            errors++;
            if (errors >= 5) {
                Print("FAL Journal: Troppi errori — riprovo al prossimo ciclo");
                break;
            }
            continue;
        }
    }

    // ── Riepilogo dettagliato ──
    int toSend = eligible - alreadySent;
    Print("FAL Journal: ------------------------------------------------");
    Print("FAL Journal: Riepilogo sync:");
    Print("FAL Journal:   Ordini totali nello storico : ", total);
    Print("FAL Journal:   - non buy/sell (skip)       : ", skippedType);
    Print("FAL Journal:   Trade idonei                : ", eligible);
    Print("FAL Journal:   - già inviati               : ", alreadySent);
    Print("FAL Journal:   - da inviare                : ", toSend);
    Print("FAL Journal:   Inviati con successo        : ", synced);
    if (errors > 0)
        Print("FAL Journal:   ERRORI                     : ", errors);
    Print("FAL Journal: ------------------------------------------------");

    string status = "FAL Journal: attivo";
    if (synced > 0) status += " | +" + IntegerToString(synced) + " trade inviati";
    else if (toSend == 0 && eligible > 0) status += " | tutto sincronizzato";
    if (errors > 0) status += " | " + IntegerToString(errors) + " ERRORI";
    status += " | " + IntegerToString(eligible) + " trade totali";
    status += "\n" + TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS);
    Comment(status);
}
//+------------------------------------------------------------------+
