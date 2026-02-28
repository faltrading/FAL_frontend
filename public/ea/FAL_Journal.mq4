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
//+------------------------------------------------------------------+
#property copyright "FAL Trading Journal"
#property link      "https://faltrading.com"
#property version   "1.00"
#property strict

input string ServerURL   = "%%GATEWAY_URL%%/api/v1/broker/ea/push";
input string EAToken     = "%%EA_TOKEN%%";  // Token generato su FAL Trading Journal
input int    SyncSeconds = 60;              // Intervallo sincronizzazione (secondi)

string SENT_FILE;

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

    EventSetTimer(SyncSeconds);
    Comment("FAL Journal: attivo — sync ogni " + IntegerToString(SyncSeconds) + "s");
    Print("FAL Journal avviato. Account: ", AccountNumber(),
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
    // Aggiorna in-memory per il ciclo corrente
    sentData += entry;
    // Persiste su file
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
    int synced  = 0;
    int errors  = 0;

    for (int i = 0; i < total; i++) {
        if (!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
        if (OrderType() != OP_BUY && OrderType() != OP_SELL) continue;
        if (IsTicketSent(sentData, OrderTicket())) continue;

        string side      = (OrderType() == OP_BUY) ? "buy" : "sell";
        string openTime  = TimeToString(OrderOpenTime(),  TIME_DATE | TIME_SECONDS);
        string closeTime = TimeToString(OrderCloseTime(), TIME_DATE | TIME_SECONDS);
        // MT4 usa "." come separatore data (2024.01.15 10:30:00) — il backend capisce entrambi

        // Sanitizza il commento per non rompere il JSON
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

        char    result[];
        string  respHeaders;
        string  reqHeaders = "Content-Type: application/json\r\n";

        int httpCode = WebRequest("POST", ServerURL, reqHeaders, 5000, postData, result, respHeaders);

        if (httpCode == 200 || httpCode == 201) {
            MarkTicketSent(sentData, OrderTicket());
            synced++;
        } else if (httpCode < 0) {
            // WebRequest non abilitato per questo URL
            Print("FAL Journal: WebRequest bloccato (", httpCode, ").",
                  " Vai su Strumenti > Opzioni > Expert Advisor e aggiungi: ", ServerURL);
            errors++;
            break;  // URL non abilitato — inutile riprovare altri trade
        } else {
            // Errore HTTP dal server (4xx/5xx)
            string resp = CharArrayToString(result);
            Print("FAL Journal: HTTP ", httpCode, " ticket ", OrderTicket(), " — ", resp);
            errors++;
            if (errors >= 5) { Print("FAL Journal: troppi errori, riprovo al prossimo ciclo"); break; }
            continue;  // Salta questo trade e prova i successivi
        }
    }

    if (synced > 0) {
        Print("FAL Journal: ", synced, " trade sincronizzati con FAL.");
    }

    string status = "FAL Journal: attivo";
    if (synced > 0)  status += " | +" + IntegerToString(synced) + " trade";
    if (errors > 0)  status += " | ERRORE (controlla il log)";
    status += " | " + TimeToString(TimeCurrent(), TIME_DATE | TIME_SECONDS);
    Comment(status);
}
//+------------------------------------------------------------------+
