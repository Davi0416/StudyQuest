import java.sql.*;
public class LocalDbDebug {
    public static void main(String[] args) throws Exception {
        String dataDir = System.getProperty("user.home") + "\\AppData\\Roaming\\studyquest-desktop\\data\\";

        try (Connection c = DriverManager.getConnection("jdbc:sqlite:" + dataDir + "main.db")) {
            try (Statement st = c.createStatement()) {
                ResultSet rs = st.executeQuery("SELECT MIN(id), MAX(id), COUNT(*) FROM flashcards");
                System.out.println("flashcards: min=" + rs.getLong(1) + " max=" + rs.getLong(2) + " count=" + rs.getInt(3));

                rs = st.executeQuery("SELECT COUNT(*) FROM flashcards WHERE id IN (885,886,887,888,957,958,959,960,1029,1030,1031,1032)");
                System.out.println("IDs dos leitner_cards que existem: " + rs.getInt(1));

                rs = st.executeQuery("SELECT id, noId, LEFT(frente,40) FROM flashcards ORDER BY id LIMIT 5");
                System.out.println("Primeiros 5 flashcards:");
                while (rs.next()) System.out.println("  id=" + rs.getLong(1) + " noId=" + rs.getLong(2) + " frente=" + rs.getString(3));

                rs = st.executeQuery("SELECT id, noId, LEFT(frente,40) FROM flashcards ORDER BY id DESC LIMIT 5");
                System.out.println("Ultimos 5 flashcards:");
                while (rs.next()) System.out.println("  id=" + rs.getLong(1) + " noId=" + rs.getLong(2) + " frente=" + rs.getString(3));
            }
        }
    }
}
