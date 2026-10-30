const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const ModalDialog = require('stremio/components/ModalDialog');
const { default: Button } = require('stremio/components/Button');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { useMihonCategories } = require('stremio/common/MihonCategories');
const styles = require('./CategoryAssignmentModal.less');

const CategoryAssignmentModal = ({ item, onClose }) => {
    const { categories, getItemCategory, setItemCategory, addCategory } = useMihonCategories();
    const [newCatInput, setNewCatInput] = React.useState('');
    const currentCategory = React.useMemo(() => {
        return getItemCategory(item?._id);
    }, [getItemCategory, item?._id]);

    const handleSelectCategory = React.useCallback((catName) => {
        if (!item?._id) return;
        if (currentCategory === catName) {
            setItemCategory(item._id, null);
        } else {
            setItemCategory(item._id, catName, item);
        }
    }, [item?._id, currentCategory, setItemCategory]);

    const handleClearCategory = React.useCallback(() => {
        if (!item?._id) return;
        setItemCategory(item._id, null);
    }, [item?._id, setItemCategory]);

    const handleAddNewCategory = React.useCallback((e) => {
        if (e) e.preventDefault();
        const trimmed = newCatInput.trim();
        if (!trimmed) return;
        const added = addCategory(trimmed);
        if (added && item?._id) {
            setItemCategory(item._id, trimmed, item);
        }
        setNewCatInput('');
    }, [newCatInput, addCategory, item?._id, setItemCategory]);

    const posterUrl = React.useMemo(() => {
        if (!item?.poster) return null;
        return typeof item.poster === 'string' ? item.poster : item.poster.src;
    }, [item?.poster]);

    return (
        <ModalDialog
            title="Assign Category"
            onCloseRequest={onClose}
        >
            <div className={styles['assignment-modal-content']}>
                <div className={styles['item-header']}>
                    {posterUrl && (
                        <img
                            src={posterUrl}
                            alt=""
                            className={styles['item-poster']}
                        />
                    )}
                    <div className={styles['item-info']}>
                        <div className={styles['item-title']} title={item?.name || 'Untitled'}>
                            {item?.name || 'Untitled'}
                        </div>
                        <div className={styles['item-subtitle']}>
                            {currentCategory ? `Currently in: ${currentCategory}` : 'Currently: Uncategorized'}
                        </div>
                    </div>
                </div>

                <div className={styles['categories-list']}>
                    {/* Uncategorized / None option */}
                    <div
                        className={classnames(styles['category-row'], {
                            [styles['selected']]: !currentCategory
                        })}
                        onClick={handleClearCategory}
                    >
                        <span className={styles['category-name']}>None (Uncategorized)</span>
                        <div className={styles['radio-indicator']}>
                            <div className={styles['radio-inner']} />
                        </div>
                    </div>

                    {categories.map((catName) => {
                        const isSelected = currentCategory === catName;
                        return (
                            <div
                                key={catName}
                                className={classnames(styles['category-row'], {
                                    [styles['selected']]: isSelected
                                })}
                                onClick={() => handleSelectCategory(catName)}
                            >
                                <span className={styles['category-name']}>{catName}</span>
                                <div className={styles['radio-indicator']}>
                                    <div className={styles['radio-inner']} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form className={styles['new-category-form']} onSubmit={handleAddNewCategory}>
                    <input
                        type="text"
                        placeholder="Create & assign new category..."
                        value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        className={styles['new-category-input']}
                    />
                    <Button
                        className={styles['add-category-btn']}
                        onClick={handleAddNewCategory}
                    >
                        + Add
                    </Button>
                </form>

                <Button className={styles['done-btn']} onClick={onClose}>
                    Done
                </Button>
            </div>
        </ModalDialog>
    );
};

CategoryAssignmentModal.propTypes = {
    item: PropTypes.shape({
        _id: PropTypes.string,
        name: PropTypes.string,
        poster: PropTypes.any,
        type: PropTypes.string
    }),
    onClose: PropTypes.func.isRequired
};

module.exports = CategoryAssignmentModal;
