module.exports = {
  up: async (queryInterface) => {
    // Helper to safely add an index if it doesn't already exist
    const safeAddIndex = async (table, columns, name) => {
      try {
        await queryInterface.addIndex(table, columns, { name });
      } catch (err) {
        // Ignore if index already exists
        if (!err.message || (!err.message.includes("already exists") && !err.message.includes("duplicate"))) {
          console.warn(`[Migration warning] Could not add index ${name} on ${table}:`, err.message);
        }
      }
    };

    // 1. Conversations table indexes
    // Accelerates reverse sender/receiver lookup & queries where user is receiver
    await safeAddIndex("conversations", ["receiver_id"], "idx_conversations_receiver_id");
    await safeAddIndex("conversations", ["sender_id", "updated_at"], "idx_conversations_sender_updated");
    await safeAddIndex("conversations", ["receiver_id", "updated_at"], "idx_conversations_receiver_updated");

    // 2. Messages table indexes
    // Accelerates conversation message history pagination & DISTINCT ON last-message lookup
    await safeAddIndex("messages", ["conversation_id", "id"], "idx_messages_conversation_id_id");
    // Accelerates unread message counting per conversation
    await safeAddIndex("messages", ["conversation_id", "sender_id", "is_seen"], "idx_messages_conversation_unread");
    // Accelerates message deletion visibility filters
    await safeAddIndex("messages", ["conversation_id", "is_hidden_for_sender_id"], "idx_messages_conv_hidden_sender");
    await safeAddIndex("messages", ["conversation_id", "is_hidden_for_receiver_id"], "idx_messages_conv_hidden_receiver");

    // 3. User sessions table index
    // Accelerates active session lookups and bulk revocation during logout
    await safeAddIndex("user_sessions", ["user_id", "is_revoked"], "idx_user_sessions_user_revoked");
  },

  down: async (queryInterface) => {
    const safeRemoveIndex = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (err) {
        // Ignore
      }
    };

    await safeRemoveIndex("conversations", "idx_conversations_receiver_id");
    await safeRemoveIndex("conversations", "idx_conversations_sender_updated");
    await safeRemoveIndex("conversations", "idx_conversations_receiver_updated");
    await safeRemoveIndex("messages", "idx_messages_conversation_id_id");
    await safeRemoveIndex("messages", "idx_messages_conversation_unread");
    await safeRemoveIndex("messages", "idx_messages_conv_hidden_sender");
    await safeRemoveIndex("messages", "idx_messages_conv_hidden_receiver");
    await safeRemoveIndex("user_sessions", "idx_user_sessions_user_revoked");
  },
};
