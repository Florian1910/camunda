const { ZBClient } = require('zeebe-node');

let executionCount = 0;

async function main() {
  try {
    console.log('🚀 Starte Camunda Worker...');

    const zbc = new ZBClient('localhost:26500', {
      loglevel: 'INFO',
      retry: true,
    });

    console.log('✅ Verbunden mit Zeebe');

    // =========================================================================
    // 1. WORKER (Pool 1): "Anfrage vorbereiten"
    // =========================================================================
    zbc.createWorker({
      taskType: 'anfrage-vorbereiten',
      taskHandler: async (job) => {
        console.log('\n=== 1. ANFRAGE VORBEREITEN ===');
        const korrelationsId = 'A-' + Date.now();
        console.log(`🔑 Erzeuge anfrageID: ${korrelationsId}`);

        await job.complete({
          anfrageID: korrelationsId,
        });
        console.log('✅ Anfrage vorbereitet, anfrageID gesendet.');
      },
    });

    // =========================================================================
    // 2. WORKER (Pool 2): "Anfrage bearbeiten"
    // =========================================================================
    zbc.createWorker({
      taskType: 'anfrage-bearbeiten',
      taskHandler: async (job) => {
        console.log('\n=== 2. ANFRAGE BEARBEITEN (POOL 2) ===');
        console.log('📊 Empfangene Variablen:', job.variables);

        let entscheidung;
        
        // 1. Prüfe den Zähler
        if (executionCount === 0) {
          entscheidung = 'nein'; // Erste Ausführung
        } else {
          entscheidung = 'ja';    // Zweite und alle weiteren Ausführungen
        }
        
        // 2. Erhöhe den Zähler für das nächste Mal
        executionCount++;
        
        console.log(`⚖️ Entscheidung getroffen (Lauf ${executionCount}): ${entscheidung}`);

        // 3. Sende die Variable als 'status' an den Prozess.
        await job.complete({
          status: entscheidung, 
        });

        console.log('✅ Anfrage bearbeitet, status gesendet.');
      },
    });

    // =========================================================================
    // 3. WORKER (Pool 1): "Arbeit fortsetzen"
    // =========================================================================
    zbc.createWorker({
      taskType: 'arbeit-fortsetzen',
      taskHandler: async (job) => {
        console.log('\n=== 3. ARBEIT FORTSETZEN (Angenommen-Pfad) ===');
        console.log('📊 Variablen:', job.variables);

        await job.complete();
        console.log('✅ Arbeit fortgesetzt.');
      },
    });

    // --- Info-Ausgabe ---
    console.log('\n👂 Alle 3 Worker sind jetzt aktiv:');
    console.log('   1. anfrage-vorbereiten');
    console.log('   2. anfrage-bearbeiten');
    console.log('   3. arbeit-fortsetzen');
    console.log('\n💡 Drücke Ctrl+C zum Beenden');
  } catch (error) {
    console.error('💥 Schwerer Fehler beim Starten des Workers:', error);
    process.exit(1);
  }
}

main();
