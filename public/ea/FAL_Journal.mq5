//+------------------------------------------------------------------+
//|                                              FAL_Journal.mq5      |
//|                         FAL Trading Journal — EA per MT5          |
//|                                                                    |
//|  INSTALLAZIONE:                                                    |
//|  1. Copia questo file in: MetaTrader5/MQL5/Experts/               |
//|  2. Compila (F7) nell'editor MetaEditor                           |
//|  3. Trascina l'EA su qualsiasi grafico                            |
//|  4. Vai su Strumenti > Opzioni > Expert Advisor                    |
//|     → Abilita "Consenti WebRequest" per il tuo gateway URL         |
//|  5. IMPORTANTE: nel tab "Cronologia" (History) impostare           |
//|     il periodo su "Tutta la cronologia" (All History)              |
//|     altrimenti l'EA vedrà solo i trade del periodo selezionato     |
//+------------------------------------------------------------------+
#property copyright "FAL Trading Journal"
#property link      "https://faltrading.com"
#property version   "1.10"

input string ServerURL   = "%%GATEWAY_URL%%/api/v1/broker/ea/push";
input string EAToken     = "%%EA_TOKEN%%";  // Token generato su FAL Trading Journal
input int    SyncSeconds = 60;              // Intervallo sincronizzazione (secondi)

string SENT_FILE;
bool   g_firstSync = true;

//+------------------------------------------------------------------+
int OnInit()
{
    SENT_FILE = "fal_sent_" + StringSubstr(EAToken, 0, 8) + ".txt";

    if(StringLen(EAToken) < 10 || StringFind(EAToken, "%%") >= 0) {
        Alert("FAL Journal: Token EA non configurato!\n"
              "Scarica di nuovo il file da FAL Trading Journal.");
        return INIT_PARAMETERS_INCORRECT;
    }
    if(StringFind(ServerURL, "%%") >= 0) {
        Alert("FAL Journal: URL del server non configurato!");
        return INIT_PARAMETERS_INCORRECT;
    }

    Print("========================================================");
    Print("FAL Journal v1.1 — avvio");
    Print("  Account : ", AccountInfoInteger(ACCOUNT_LOGIN));
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
    if(g_firstSync) {
        g_firstSync = false;
        EventSetTimer(SyncSeconds); // Passa all'intervallo normale

        // [STEP 1] Test connessione
        Print("FAL Journal: [STEP 1/3] Test connessione al server...");
        int testCode = TestServerConnection();
        if(testCode < 0) {
            PrintConnectivityError();
            return;
        }
        Print("FAL Journal: [STEP 1/3] OK — server raggiungibile (HTTP ", testCode, ")");

        // [STEP 2] Carica storico
        Print("FAL Journal: [STEP 2/3] Caricamento storico deal...");
    }

    // [STEP 3] Sincronizza
    SyncTrades();
}

void OnTick() { /* gestito dal timer */ }

//+------------------------------------------------------------------+
//  Handler eventi di trade (MT5)
//+------------------------------------------------------------------+
void OnTradeTransaction(
    const MqlTradeTransaction &trans,
    const MqlTradeRequest     &request,
    const MqlTradeResult      &tradeResult)
{
    // Sincronizza subito alla chiusura di una posizione
    if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
        Print("FAL Journal: Nuovo deal rilevato — sync immediata");
        SyncTrades();
    }
}

//+------------------------------------------------------------------+
//  Test connessione al server
//+------------------------------------------------------------------+
int TestServerConnection()
{
    // Invia un token fittizio: il server risponderà 401 (token non valido)
    // ma questo conferma che il server è raggiungibile.
    // Se WebRequest è bloccato, restituisce codice negativo.
    string testJson = "{\"token\":\"__connectivity_test__\","
                      "\"ticket\":0,\"symbol\":\"TEST\",\"type\":\"buy\","
                      "\"lots\":0,\"open_price\":0,\"close_price\":0,"
                      "\"open_time\":\"2000.01.01 00:00:00\","
                      "\"close_time\":\"2000.01.01 00:00:00\","
                      "\"profit\":0,\"commission\":0,\"swap\":0,"
                      "\"magic\":0,\"comment\":\"test\",\"platform\":\"mt5\"}";

    char postData[];
    StringToCharArray(testJson, postData, 0, StringLen(testJson));
    char serverResp[];
    string respHeaders;
    string reqHeaders = "Content-Type: application/json\r\n";

    ResetLastError();
    int httpCode = WebRequest("POST", ServerURL, reqHeaders, 10000, postData, serverResp, respHeaders);

    if(httpCode < 0) {
        int err = GetLastError();
        Print("FAL Journal: WebRequest FALLITO — httpCode=", httpCode, " errore_sistema=", err);
        return -1;
    }

    // Qualsiasi risposta HTTP (anche 401) = server raggiungibile
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
    int h = FileOpen(SENT_FILE, FILE_READ | FILE_ANSI | FILE_COMMON);
    if(h != INVALID_HANDLE) {
        while(!FileIsEnding(h))
            data += FileReadString(h);
        FileClose(h);
    }
    return data;
}

bool IsTicketSent(const string &sentData, long ticket)
{
    return StringFind(sentData, "," + IntegerToString(ticket) + ",") >= 0;
}

void MarkTicketSent(string &sentData, long ticket)
{
    string entry = IntegerToString(ticket) + ",";
    sentData += entry;
    int h = FileOpen(SENT_FILE, FILE_READ | FILE_WRITE | FILE_ANSI | FILE_COMMON);
    if(h != INVALID_HANDLE) {
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
    if(!HistorySelect(0, TimeCurrent())) {
        Print("FAL Journal: HistorySelect() FALLITO — impossibile caricare storico");
        Comment("FAL Journal: Errore caricamento storico");
        return;
    }

    string sentData = ReadSentTickets();
    int total  = HistoryDealsTotal();

    // ── Diagnostica: conta i deal per categoria ──
    int eligible     = 0;   // Deal di chiusura BUY/SELL
    int skippedEntry = 0;   // Deal non di chiusura (DEAL_ENTRY_IN, ecc.)
    int skippedType  = 0;   // Deal non BUY/SELL (balance, credit, ecc.)
    int alreadySent  = 0;   // Già inviati in precedenza
    int synced       = 0;
    int errors       = 0;

    Print("FAL Journal: [STEP 3/3] Storico caricato — ", total, " deal totali");

    if(total == 0) {
        Print("FAL Journal: ZERO deal nello storico!");
        Print("FAL Journal: Verifica che nel tab 'Cronologia' di MetaTrader");
        Print("FAL Journal: sia selezionato 'Tutta la cronologia' (tasto destro > periodo)");
        Comment("FAL Journal: attivo — 0 deal nello storico\n"
                "Verifica 'Tutta la cronologia' nel tab Cronologia");
        return;
    }

    for(int i = 0; i < total; i++) {
        ulong deal = HistoryDealGetTicket(i);
        if(deal == 0) continue;

        // Solo deal di chiusura posizione
        long entry = HistoryDealGetInteger(deal, DEAL_ENTRY);
        if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT) {
            skippedEntry++;
            continue;
        }

        long dealType = HistoryDealGetInteger(deal, DEAL_TYPE);
        if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) {
            skippedType++;
            continue;
        }

        eligible++;

        if(IsTicketSent(sentData, (long)deal)) {
            alreadySent++;
            continue;
        }

        // Dati dal deal di chiusura
        string   symbol     = HistoryDealGetString(deal, DEAL_SYMBOL);
        double   closePrice = HistoryDealGetDouble(deal, DEAL_PRICE);
        datetime closeTime  = (datetime)HistoryDealGetInteger(deal, DEAL_TIME);
        double   profit     = HistoryDealGetDouble(deal, DEAL_PROFIT);
        double   commission = HistoryDealGetDouble(deal, DEAL_COMMISSION);
        double   swap       = HistoryDealGetDouble(deal, DEAL_SWAP);
        double   volume     = HistoryDealGetDouble(deal, DEAL_VOLUME);
        long     magic      = HistoryDealGetInteger(deal, DEAL_MAGIC);
        string   comment    = HistoryDealGetString(deal, DEAL_COMMENT);
        long     posId      = HistoryDealGetInteger(deal, DEAL_POSITION_ID);

        // Deal di uscita SELL = la posizione era BUY, e viceversa
        string side = (dealType == DEAL_TYPE_SELL) ? "buy" : "sell";

        // Cerca il deal di apertura tramite DEAL_POSITION_ID
        double   openPrice = closePrice; // fallback
        datetime openTime  = closeTime;

        for(int j = 0; j < total; j++) {
            ulong inDeal = HistoryDealGetTicket(j);
            if(inDeal == 0 || inDeal == deal) continue;
            long inEntry = HistoryDealGetInteger(inDeal, DEAL_ENTRY);
            if(inEntry != DEAL_ENTRY_IN && inEntry != DEAL_ENTRY_INOUT) continue;
            if(HistoryDealGetInteger(inDeal, DEAL_POSITION_ID) != posId) continue;
            openPrice = HistoryDealGetDouble(inDeal, DEAL_PRICE);
            openTime  = (datetime)HistoryDealGetInteger(inDeal, DEAL_TIME);
            break;
        }

        // Sanitizza il commento per non rompere il JSON
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
            "\"platform\":\"mt5\""
            "}",
            EAToken,
            (long)deal,
            symbol,
            side,
            volume,
            openPrice,
            closePrice,
            TimeToString(openTime,  TIME_DATE | TIME_SECONDS),
            TimeToString(closeTime, TIME_DATE | TIME_SECONDS),
            profit,
            commission,
            swap,
            magic,
            comment
        );

        char   postData[];
        StringToCharArray(json, postData, 0, StringLen(json));
        char   serverResp[];
        string respHeaders;
        string reqHeaders = "Content-Type: application/json\r\n";

        ResetLastError();
        int httpCode = WebRequest("POST", ServerURL, reqHeaders, 5000, postData, serverResp, respHeaders);

        if(httpCode == 200 || httpCode == 201) {
            MarkTicketSent(sentData, (long)deal);
            synced++;
        } else if(httpCode < 0) {
            int err = GetLastError();
            Print("FAL Journal: WebRequest BLOCCATO per deal ", (long)deal,
                  " — httpCode=", httpCode, " errore=", err);
            PrintConnectivityError();
            errors++;
            break;
        } else {
            string resp = CharArrayToString(serverResp);
            Print("FAL Journal: HTTP ", httpCode, " deal ", (long)deal,
                  " symbol=", symbol, " — ", resp);
            errors++;
            if(errors >= 5) {
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
    Print("FAL Journal:   Deal totali nello storico : ", total);
    Print("FAL Journal:   - non di chiusura (skip)  : ", skippedEntry);
    Print("FAL Journal:   - non buy/sell (skip)     : ", skippedType);
    Print("FAL Journal:   Trade idonei              : ", eligible);
    Print("FAL Journal:   - già inviati             : ", alreadySent);
    Print("FAL Journal:   - da inviare              : ", toSend);
    Print("FAL Journal:   Inviati con successo      : ", synced);
    if(errors > 0)
        Print("FAL Journal:   ERRORI                   : ", errors);
    Print("FAL Journal: ------------------------------------------------");

    // Aggiorna status sul grafico
    string status = "FAL Journal: attivo";
    if(synced > 0) status += " | +" + IntegerToString(synced) + " trade inviati";
    else if(toSend == 0 && eligible > 0) status += " | tutto sincronizzato";
    if(errors > 0) status += " | " + IntegerToString(errors) + " ERRORI";
    status += " | " + IntegerToString(eligible) + " trade totali";
    status += "\n" + TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS);
    Comment(status);
}
//+------------------------------------------------------------------+
