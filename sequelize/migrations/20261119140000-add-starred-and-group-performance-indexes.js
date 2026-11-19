module.exports = {
  up: async (queryInterface) => {
    // Helper to safely execute index creation without throwing on duplicates
    const safeAddIndex = async (table, columns, name) => {
      try {
        await queryInterface.addIndex(table, columns, { name });
      } catch (err) {
        if (!err.message || (!err.message.includes("already exists") && !err.message.includes("duplicate"))) {
          console.warn(`[Migration warning] Could not add index ${name} on ${table}:`, err.message);
        }
      }
    };

    // 1. Starred Messages Indexes (Eliminates full table scans when fetching direct & group message history)
    await safeAddIndex("starred_messages", ["message_id"], "idx_starred_messages_message_id");
    await safeAddIndex("starred_messages", ["group_message_id"], "idx_starred_messages_group_msg_id");
    await safeAddIndex("starred_messages", ["user_id"], "idx_starred_messages_user_id");

    // 2. Group Members Indexes (Eliminates full table scans when fetching user's groups in the sidebar)
    await safeAddIndex("group_members", ["user_id"], "idx_group_members_user_id");
    await safeAddIndex("group_members", ["group_id", "deleted_at"], "idx_group_members_group_deleted");

    // 3. Group Messages Indexes (Accelerates message history pagination & latest message preview subqueries)
    await safeAddIndex("group_messages", ["group_id", "id"], "idx_group_messages_group_id_id");
    await safeAddIndex("group_messages", ["group_id", "deleted_at", "created_at"], "idx_group_messages_group_created");
    await safeAddIndex("group_messages", ["reply_to_id"], "idx_group_messages_reply_to_id");

    // 4. Messages reply_to index (Accelerates reply preview lookups)
    await safeAddIndex("messages", ["reply_to_id"], "idx_messages_reply_to_id");

    // 5. Group Message Seen Indexes
    await safeAddIndex("group_message_seen", ["message_id"], "idx_group_message_seen_msg_id");
    await safeAddIndex("group_message_seen", ["user_id"], "idx_group_message_seen_user_id");

    // 6. Conversations bidirectional pair lookup
    await safeAddIndex("conversations", ["receiver_id", "sender_id"], "idx_conversations_receiver_sender");

    // 7. User sessions active ordering
    await safeAddIndex("user_sessions", ["user_id", "last_active_at"], "idx_user_sessions_user_active");
  },

  down: async (queryInterface) => {
    const safeRemoveIndex = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (err) {
        // Ignore
      }
    };

    await safeRemoveIndex("starred_messages", "idx_starred_messages_message_id");
    await safeRemoveIndex("starred_messages", "idx_starred_messages_group_msg_id");
    await safeRemoveIndex("starred_messages", "idx_starred_messages_user_id");
    await safeRemoveIndex("group_members", "idx_group_members_user_id");
    await safeRemoveIndex("group_members", "idx_group_members_group_deleted");
    await safeRemoveIndex("group_messages", "idx_group_messages_group_id_id");
    await safeRemoveIndex("group_messages", "idx_group_messages_group_created");
    await safeRemoveIndex("group_messages", "idx_group_messages_reply_to_id");
    await safeRemoveIndex("messages", "idx_messages_reply_to_id");
    await safeRemoveIndex("group_message_seen", "idx_group_message_seen_msg_id");
    await safeRemoveIndex("group_message_seen", "idx_group_message_seen_user_id");
    await safeRemoveIndex("conversations", "idx_conversations_receiver_sender");
    await safeRemoveIndex("user_sessions", "idx_user_sessions_user_active");
  },
};
