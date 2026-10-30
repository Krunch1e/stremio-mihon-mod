const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useMihonCategories } = require('stremio/common/MihonCategories');
const styles = require('./MihonCategoryBar.less');

const MihonCategoryBar = ({
    activeCategory,
    onSelectCategory,
    totalCount,
    itemCounts,
    onOpenManager
}) => {
    const { categories } = useMihonCategories();

    return (
        <div className={styles['mihon-bar-container']}>
            <div className={styles['tabs-row']}>
                <div
                    className={classnames(styles['category-tab'], {
                        [styles['active']]: activeCategory === 'ALL'
                    })}
                    onClick={() => onSelectCategory('ALL')}
                >
                    <span>All</span>
                    <span className={styles['tab-count']}>{totalCount}</span>
                </div>

                {categories.map((catName) => {
                    const count = itemCounts?.[catName] || 0;
                    return (
                        <div
                            key={catName}
                            className={classnames(styles['category-tab'], {
                                [styles['active']]: activeCategory === catName
                            })}
                            onClick={() => onSelectCategory(catName)}
                        >
                            <span>{catName}</span>
                            <span className={styles['tab-count']}>{count}</span>
                        </div>
                    );
                })}

                <div
                    className={classnames(styles['category-tab'], {
                        [styles['active']]: activeCategory === 'UNCATEGORIZED'
                    })}
                    onClick={() => onSelectCategory('UNCATEGORIZED')}
                >
                    <span>Uncategorized</span>
                    <span className={styles['tab-count']}>
                        {itemCounts?.['_UNCATEGORIZED'] || 0}
                    </span>
                </div>

                <div
                    className={styles['manage-tab-btn']}
                    onClick={onOpenManager}
                    title="Manage custom categories"
                >
                    <span>+ Manage</span>
                </div>
            </div>
        </div>
    );
};

MihonCategoryBar.propTypes = {
    activeCategory: PropTypes.string.isRequired,
    onSelectCategory: PropTypes.func.isRequired,
    totalCount: PropTypes.number.isRequired,
    itemCounts: PropTypes.object.isRequired,
    onOpenManager: PropTypes.func.isRequired
};

module.exports = MihonCategoryBar;
