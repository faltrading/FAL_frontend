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
//+------------------------------------------------------------------+
#property copyright "FAL Trading Journal"
#property link      "https://faltrading.com"
#property version   "1.00"

input string ServerURL   = "%%GATEWAY_URL%%/api/v1/broker/ea/push";
input string EAToken     = "%%EA_TOKEN%%";  // Token generato su FAL Trading Journal
input int    SyncSeconds = 60;              // Intervallo sincronizzazione (secondi)

string SENT_FILE;

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

    EventSetTimer(SyncSeconds);
    Comment("FAL Journal: attivo — sync ogni " + IntegerToString(SyncSeconds) + "s");
    Print("FAL Journal avviato. Account: ", AccountInfoInteger(ACCOUNT_LOGIN),
          " | Token: ", StringSubstr(EAToken, 0, 8), "...");
    return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
    EventKillTimer();
    Comment("");
}

void OnTimer() { SyncTrades(); }
void OnTick()  {}

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
    if(!HistorySelect(0, TimeCurrent())) return;

    string sentData = ReadSentTickets();
    int total  = HistoryDealsTotal();
    int synced = 0;
    int errors = 0;

    for(int i = 0; i < total; i++) {
        ulong deal = HistoryDealGetTicket(i);
        if(deal == 0) continue;

        // Solo deal di chiusura posizione
        long entry = HistoryDealGetInteger(deal, DEAL_ENTRY);
        if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_INOUT) continue;

        long dealType = HistoryDealGetInteger(deal, DEAL_TYPE);
        if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

        if(IsTicketSent(sentData, (long)deal)) continue;

        // Dati dal deal di chiusura
        string   symbol    = HistoryDealGetString(deal, DEAL_SYMBOL);
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
            "\"comment\":\"%s\""
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
        char   result[];
        string respHeaders;
        string reqHeaders = "Content-Type: application/json\r\n";

        int httpCode = WebRequest("POST", ServerURL, reqHeaders, 5000, postData, result, respHeaders);

        if(httpCode == 200 || httpCode == 201) {
            MarkTicketSent(sentData, (long)deal);
            synced++;
        } else if(httpCode < 0) {
            Print("FAL Journal: WebRequest bloccato (", httpCode, ").",
                  " Vai su Strumenti > Opzioni > Expert Advisor e aggiungi: ", ServerURL);
            errors++;
            break;  // URL non abilitato — inutile riprovare altri trade
        } else {
            string resp = CharArrayToString(result);
            Print("FAL Journal: HTTP ", httpCode, " deal ", (long)deal, " — ", resp);
            errors++;
            if(errors >= 5) { Print("FAL Journal: troppi errori, riprovo al prossimo ciclo"); break; }
            continue;  // Salta questo trade e prova i successivi
        }
    }

    if(synced > 0)
        Print("FAL Journal: ", synced, " trade sincronizzati con FAL.");

    string status = "FAL Journal: attivo";
    if(synced > 0) status += " | +" + IntegerToString(synced) + " trade";
    if(errors > 0) status += " | ERRORE (controlla il log)";
    status += " | " + TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS);
    Comment(status);
}
//+------------------------------------------------------------------+
