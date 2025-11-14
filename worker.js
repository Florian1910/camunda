const { ZBClient } = require('zeebe-node');

// Diese Variable existiert nur, solange der Worker läuft.
let executionCount = 0;

async function main() {
  try {
    console.log('🚀 Starte Camunda Worker...');

    const zbc = new ZBClient('localhost:26500', {
      loglevel: 'INFO',
      retry: true,
    });

    console.log('✅ Verbunden mit Zeebe');

    // ------------------------------------------------------------
    // 1. Anfrage schreiben
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'anfrage-schreiben',
      taskHandler: async (job) => {
        console.log('\n=== 1. Anfrage schreiben ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const nachrichtVomUser1 = job.variables.berg;
        const nachrichtVomUser2 = job.variables.datum;

        const eindeutigeAnfrageID = job.processInstanceKey;

        console.log(`🔑 Erzeuge eindeutige AnfrageID: ${eindeutigeAnfrageID}`);

        await job.complete({
          anfrageID: eindeutigeAnfrageID,
          berg: nachrichtVomUser1,
          datum: nachrichtVomUser2
        });

        console.log(`✅ "Anfrage stellen" abgeschlossen.`);
      }
    });

    // ------------------------------------------------------------
    // 2. Angebot erstellen
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'angebot-erstellen',
      taskHandler: async (job) => {
        console.log('\n=== 2. Angebot erstellen ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const anfrageID = job.variables.anfrageID;
        const bergWunsch = job.variables.berg;

        const angebotText =
          `Hier ist dein Angebot für die Reise zum ${bergWunsch}: Flug + Unterkunft: 750 EUR.`;

        console.log(`📝 Angebot erstellt: ${angebotText}`);

        await job.complete({
          angebot: angebotText,
          anfrageID: anfrageID
        });

        console.log(`✅ "Angebot erstellen" abgeschlossen.`);
      }
    });

    // ------------------------------------------------------------
    // 3. Absage erstellen
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'absage-erstellen',
      taskHandler: async (job) => {
        console.log('\n=== 3. Absage erstellen ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const anfrageID = job.variables.anfrageID;
        const bergWunsch = job.variables.berg;

        const absageText = `Der Berg ${bergWunsch} wird leider nicht unterstützt.`;

        console.log(`📝 Absage erstellt: ${absageText}`);

        await job.complete({
          absage: absageText,
          anfrageID: anfrageID
        });

        console.log(`✅ "Absage erstellen" abgeschlossen.`);
      }
    });

    // ------------------------------------------------------------
    // 4. Zusage schreiben
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'zusage-schreiben',
      taskHandler: async (job) => {
        console.log('\n=== 4. Zusage schreiben ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const korrelationsID = job.variables.anfrageID;
        const antwortText = "Das ist die finale Antwort an den Kunden.";

        console.log(`📝 Antwort erstellt: ${antwortText}`);
        console.log(`🔑 Korrelationsschlüssel: ${korrelationsID}`);

        await job.complete({
          anfrageID: korrelationsID,
          Antwort: antwortText
        });

        console.log(`✅ "Zusage schreiben" abgeschlossen.`);
      }
    });

    // ------------------------------------------------------------
    // 5. Hotelanfrage schreiben
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'hotelanfrage-schreiben',
      taskHandler: async (job) => {
        console.log('\n=== Hotelanfrage schreiben ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const reiseDatum = job.variables.datum;
        const hotelAnfrageID = job.processInstanceKey;

        console.log(`🔑 Hotel-Korrelationsschlüssel: ${hotelAnfrageID}`);

        await job.complete({
          datum: reiseDatum,
          hotelAnfrageID: hotelAnfrageID
        });

        console.log('✅ "Hotelanfrage schreiben" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 6. Hotel-Angebot senden
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'hotel-angebot-senden',
      taskHandler: async (job) => {
        console.log('\n=== Hotel-Angebot senden ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const angefragtesDatum = job.variables.datum;
        const korrelationsID = job.variables.hotelAnfrageID;

        const vorschlagText =
          `Hier ist unser Vorschlag für ${angefragtesDatum}: Hotel "Sonne", 120 EUR/Nacht.`;

        await job.complete({
          vorschlag: vorschlagText,
          hotelAnfrageID: korrelationsID
        });

        console.log('✅ "Hotel-Angebot senden" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 7. Fluganfrage schreiben
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'fluganfrage-schreiben',
      taskHandler: async (job) => {
        console.log('\n=== Fluganfrage schreiben ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const flugWunsch = job.variables.flugZiel;
        const flugAnfrageID = job.processInstanceKey;

        await job.complete({
          flugZiel: flugWunsch,
          flugAnfrageID: flugAnfrageID
        });

        console.log('✅ "Fluganfrage schreiben" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 8. Flug-Angebot senden
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'flug-angebot-senden',
      taskHandler: async (job) => {
        console.log('\n=== Flug-Angebot senden ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const angefragtesZiel = job.variables.flugZiel;
        const korrelationsID = job.variables.flugAnfrageID;

        const angebotText =
          `Hier ist unser Flug-Angebot für ${angefragtesZiel}: 350 EUR.`;

        await job.complete({
          flugAngebot: angebotText,
          flugAnfrageID: korrelationsID
        });

        console.log('✅ "Flug-Angebot senden" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 9. Zahlungsaufforderung erstellen
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'zahlungsaufforderung-erstellen',
      taskHandler: async (job) => {
        console.log('\n=== Zahlungsaufforderung erstellen ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const korrelationsID = job.variables.anfrageID;
        const zahlungsText = "Bitte begleichen Sie den offenen Betrag von 750 EUR.";

        await job.complete({
          anfrageID: korrelationsID,
          Zahlungsaufforderung: zahlungsText
        });

        console.log('✅ "Zahlungsaufforderung erstellen" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 10. Zahlung vorbereiten
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'zahlung-vorbereiten',
      taskHandler: async (job) => {
        console.log('\n=== Zahlung vorbereiten ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const anfrageID = job.variables.anfrageID;
        const betrag = 750;

        await job.complete({
          zahlungsID: anfrageID,
          anfrageID: anfrageID,
          Betrag: betrag
        });

        console.log('✅ "Zahlung vorbereiten" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 11. Bank-Zahlung vorbereiten
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'bank-zahlung-vorbereiten',
      taskHandler: async (job) => {
        console.log('\n=== Bank-Zahlung vorbereiten ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const verwendungszweck = job.variables.Verwendungszweck;
        const betrag = 750;

        await job.complete({
          anfrageID: verwendungszweck,
          Zahlung: betrag
        });

        console.log('✅ "Bank-Zahlung vorbereiten" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 12. Bank-Zahlungsbestätigung vorbereiten
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'bank-zahlungsbestätigung-vorbereiten',
      taskHandler: async (job) => {
        console.log('\n=== Bank-Zahlungsbestätigung vorbereiten ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const zahlungsID = job.variables.zahlungsID;
        const betrag = 750;

        await job.complete({
          zahlungsID: zahlungsID,
          Betrag: betrag
        });

        console.log('✅ "Bank-Zahlungsbestätigung vorbereiten" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 13. Hotel-Zahlung vorbereiten
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'hotel-zahlung-vorbereiten',
      taskHandler: async (job) => {
        console.log('\n=== Hotel-Zahlung vorbereiten ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const korrelationsID = job.variables.hotelAnfrageID;
        const reiseDatum = job.variables.datum;

        await job.complete({
          hotelAnfrageID: korrelationsID,
          datum: reiseDatum
        });

        console.log('✅ "Hotel-Zahlung vorbereiten" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 14. Flug-Zahlung vorbereiten
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'flug-zahlung-vorbereiten',
      taskHandler: async (job) => {
        console.log('\n=== Flug-Zahlung vorbereiten ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const korrelationsID = job.variables.flugAnfrageID;
        const reiseDatum = job.variables.datum;

        await job.complete({
          flugAnfrageID: korrelationsID,
          datum: reiseDatum
        });

        console.log('✅ "Flug-Zahlung vorbereiten" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 15. Flug-Zahlungsbestätigung senden
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'flug-zahlungsbestätigung-senden',
      taskHandler: async (job) => {
        console.log('\n=== Flug-Zahlungsbestätigung senden ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const korrelationsID = job.variables.flugAnfrageID;
        const text = "Ihre Flug-Zahlung wurde erfolgreich verbucht. Vielen Dank.";

        await job.complete({
          flugAnfrageID: korrelationsID,
          flugbestätigung: text
        });

        console.log('✅ "Flug-Zahlungsbestätigung senden" abgeschlossen.');
      }
    });

    // ------------------------------------------------------------
    // 16. Hotel-Zahlungsbestätigung senden
    // ------------------------------------------------------------
    zbc.createWorker({
      taskType: 'hotel-zahlungsbestätigung-senden',
      taskHandler: async (job) => {
        console.log('\n=== Hotel-Zahlungsbestätigung senden ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        const korrelationsID = job.variables.hotelAnfrageID;
        const text = "Ihre Hotel-Zahlung wurde erfolgreich verbucht. Wir freuen uns auf Sie.";

        await job.complete({
          hotelAnfrageID: korrelationsID,
          hotelbestätigung: text
        });

        console.log('✅ "Hotel-Zahlungsbestätigung senden" abgeschlossen.');
      }
    });

    zbc.createWorker({
  taskType: 'buchungsbestätigung-vorbereiten',
  taskHandler: async (job) => {
    console.log('\n=== Finale Buchungsbestätigung vorbereiten ===');
    console.log('📊 Empfangene Variablen:', job.variables);

    const korrelationsID = job.variables.anfrageID;

    const buchungsText = "Ihre Reise ist nun vollständig gebucht. Gute Reise!";

    console.log(`🔑 ID für Korrelation & Payload (anfrageID): ${korrelationsID}`);
    console.log(`📝 Finale Buchung: ${buchungsText}`);

    await job.complete({
      anfrageID: korrelationsID,
      buchungsbestätigung: buchungsText
    });

    console.log(`✅ "Buchungsbestätigung vorbereiten" abgeschlossen.`);
  }
});

  } catch (err) {
    console.error('❌ Fehler im Worker:', err);
  }
}



// Programm starten
main();
