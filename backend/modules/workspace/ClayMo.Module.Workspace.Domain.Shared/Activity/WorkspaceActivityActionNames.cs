namespace ClayMo.Module.Workspace.Domain.Shared.Activity;

public static class WorkspaceActivityActionNames
{
    public static class KnowledgeBase
    {
        public const string Created = "kb.created";
        public const string Updated = "kb.updated";
        public const string Deleted = "kb.deleted";
    }

    public static class Document
    {
        public const string Created = "kb.doc.created";
        public const string Updated = "kb.doc.updated";
        public const string Deleted = "kb.doc.deleted";
        public const string Moved = "kb.doc.moved";
    }

    public static class Comment
    {
        public const string Created = "kb.doc.comment.created";
        public const string Replied = "kb.doc.comment.replied";
        public const string Resolved = "kb.doc.comment.resolved";
    }

    public static class Focus
    {
        public const string Completed = "focus.completed";
    }
}