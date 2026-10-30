const React = require('react');
const PropTypes = require('prop-types');
const ModalDialog = require('stremio/components/ModalDialog');
const { default: Button } = require('stremio/components/Button');
const { useMihonCategories } = require('stremio/common/MihonCategories');
const styles = require('./CategoryManagerModal.less');

const CategoryManagerModal = ({ onClose, itemCounts }) => {
    const { categories, addCategory, removeCategory, renameCategory } = useMihonCategories();
    const [newCatName, setNewCatName] = React.useState('');
    const [editingCat, setEditingCat] = React.useState(null);
    const [editValue, setEditValue] = React.useState('');

    const handleAdd = (e) => {
        if (e) e.preventDefault();
        const trimmed = newCatName.trim();
        if (trimmed) {
            addCategory(trimmed);
            setNewCatName('');
        }
    };

    const startEditing = (name) => {
        setEditingCat(name);
        setEditValue(name);
    };

    const handleSaveEdit = (oldName) => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== oldName) {
            renameCategory(oldName, trimmed);
        }
        setEditingCat(null);
        setEditValue('');
    };

    const handleDelete = (name) => {
        if (window.confirm(`Are you sure you want to delete the category "${name}"? Titles in this category will not be removed from your library.`)) {
            removeCategory(name);
        }
    };

    return (
        <ModalDialog
            title="Manage Categories"
            onCloseRequest={onClose}
        >
            <div className={styles['manager-modal-content']}>
                <form className={styles['add-row']} onSubmit={handleAdd}>
                    <input
                        type="text"
                        placeholder="New category name..."
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className={styles['cat-input']}
                    />
                    <Button className={styles['add-btn']} onClick={handleAdd}>
                        + Add Category
                    </Button>
                </form>

                <div className={styles['categories-list']}>
                    {categories.map((name) => {
                        const count = itemCounts?.[name] || 0;
                        const isEditing = editingCat === name;
                        return (
                            <div key={name} className={styles['category-item']}>
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className={styles['edit-input']}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit(name);
                                                if (e.key === 'Escape') setEditingCat(null);
                                            }}
                                        />
                                        <div className={styles['actions']}>
                                            <Button
                                                className={`${styles['action-btn']} ${styles['save-btn']}`}
                                                onClick={() => handleSaveEdit(name)}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                className={styles['action-btn']}
                                                onClick={() => setEditingCat(null)}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className={styles['info']}>
                                            <span className={styles['name']}>{name}</span>
                                            <span className={styles['count']}>
                                                {count} {count === 1 ? 'title' : 'titles'}
                                            </span>
                                        </div>
                                        <div className={styles['actions']}>
                                            <Button
                                                className={styles['action-btn']}
                                                onClick={() => startEditing(name)}
                                            >
                                                Rename
                                            </Button>
                                            <Button
                                                className={`${styles['action-btn']} ${styles['delete-btn']}`}
                                                onClick={() => handleDelete(name)}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                <Button className={styles['done-btn']} onClick={onClose}>
                    Done
                </Button>
            </div>
        </ModalDialog>
    );
};

CategoryManagerModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    itemCounts: PropTypes.object
};

module.exports = CategoryManagerModal;
