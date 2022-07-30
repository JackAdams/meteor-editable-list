if (typeof EditableList === 'undefined') {
  EditableList = {};
}

EditableText._eventTypesAvailable = {
  'click' : 'Click',
  'dblclick' : 'Double click',
  'mousedown' : 'Mousedown'
};

EditableList._removeListNumbers = function (raw) {
  var numberStrip = new RegExp("^\\d+\\s*[-.)]?\\s+");
  return (typeof raw !== 'undefined') ? raw.replace(numberStrip, "") : "";
}

EditableList._processTextarea = function (raw, process) {
  var unprocessed = raw.split(/[\r\n]+/);
  if (typeof process === 'undefined') {
    var processed = [];
    $.each(unprocessed,function(){
      var trimmed = $.trim(this);
      if (trimmed) {
        clipped = EditableList._removeListNumbers(trimmed);
        if (clipped) {
          processed.push(clipped);    
        }
      }
    });
    return processed;
  }
  else {
    return unprocessed;  
  }
}

Template.editableList.helpers({
  context : function () {
    return this.context || this.document || this.doc || this.object || this.obj || this.data || this.dataContext || Blaze._parentData(1);
  }
});

Template.editable_list_widget.helpers({

  listName : function () {
    return this.listName;  
  },
  
  listItems : function () {
    var showList = Blaze._templateInstance().showList.get(); // The showList thing is a hack to take care of sortables and blaze not working together
	  var self = this;
    return showList && _.map(this.value || EditableText._drillDown(this.context, this.field) || [], function (item, index) { 
      var dataToReturn = {text: (self.key) ? item[self.key] : item, field: self.field, index: index};
      if (self.key) {
        dataToReturn.key = self.key;
      }
      return dataToReturn;
    });
  },
  
  editingItem : function (obj) {
    var selected = Blaze._templateInstance().selected.get();
    return selected && this.text === selected.text && this.index === selected.index;
  },
  
  placeholder : function () {
    return this.placeholder || "";  
  },
  
  canEditList : function (data) {
    return data && EditableText.userCanEdit.call(data, data.context, Mongo.Collection.get(data.collection));
  },
  
  itemIndex : function () {
    return this.index + 1;  
  },
  
  optionalTemplateHelper : function () {
    return this.template && Template[this.template];
  },

  eventTypeName : function (data) {
    var eventType = data.eventType || 'click';
    return EditableText._eventTypesAvailable[eventType] || 'Click';
  },

  getTagClass : function (className) {
    if (_.isString(className)) {
      return className;
    }
    if (_.isObject(className) && _.isFunction(className.callback)) {
      return className.callback.call(Template.instance().data, this);
    }
  }

});

var editItemAvailableEvents = _.reduce(EditableText._eventTypesAvailable, function (memo, eventTypeName, eventType) {
  memo += ((memo) ? ', ' : '') + eventType + ' .editable-list li';
  return memo;
}, '');
var editItemEvents = {};
editItemEvents[editItemAvailableEvents] = function (evt, tmpl) {
  if (evt.type !== (tmpl.data.eventType || 'click')) {
    return;
  }
  var Collection = Mongo.Collection.get(tmpl.data.collection);
  var userCanEdit = EditableText.userCanEdit.call(tmpl.data, tmpl.data.context, Collection);
  userCanEdit = (typeof tmpl.data.userCanEdit !== 'undefined') ? (tmpl.data.userCanEdit && userCanEdit) : userCanEdit;
  if (userCanEdit) {
    var selected = tmpl.selected.get();
    if (!selected || (selected && selected.index !== this.index)) {
      evt.stopImmediatePropagation();
      var parentElem = tmpl.$(evt.currentTarget).closest('li');
      document.activeElement.blur(); // Make sure the focusout event fires first when switching editable text objects, so that the first one gets saved properly
      tmpl.selected.set({text: this.text, index: this.index});
      Tracker.flush();
      EditableText._activateInput(parentElem.find('input'));
    }
  }
};

Template.editable_list_widget.events(editItemEvents);
  
var okCancelEvents = {};
okCancelEvents.ok = function (value, evt, tmpl) {
  evt.stopImmediatePropagation();
  var field = tmpl.data.field;
  var Collection = Mongo.Collection.get(tmpl.data.collection);
  var selected = tmpl.selected.get();
  var newValue = $.trim(value.toString()).replace(/mml:/g, "");
  if (selected && newValue !== selected.text) {
    var transactionText = ((newValue) ? 'edit' : 'remove') + ' ' + (tmpl.data.objectTypeText || 'list item');
    var oldArray = tmpl.data.value || EditableText._drillDown(tmpl.data.context, field) || [];
    var index = selected.index;
    if (!newValue) {
      tmpl.data.beforeUpdate = tmpl.data.beforeRemove;
      tmpl.data.afterUpdate = tmpl.data.afterRemove;
    }
    if (tmpl.data.key) { // selected has text and index fields
      newObj = oldArray[selected.index];
      newObj[tmpl.data.key] = newValue;
      newValue = newObj;
    }
    var endOfArray = ((tmpl.data.key) ? newValue[tmpl.data.key] : newValue) ? [newValue].concat(oldArray.slice(index + 1)) : oldArray.slice(index + 1);
    var editedArray = oldArray.slice(0, index).concat(endOfArray);
    var updatedValue = {};
    updatedValue[field] = editedArray;
    EditableText.update.call(tmpl.data, Collection, tmpl.data.context, {$set: updatedValue}, transactionText);
  }
  tmpl.selected.set(null);
}
okCancelEvents.cancel = function (value, evt, tmpl) {
  evt.stopImmediatePropagation();
  tmpl.selected.set(null);
}

Template.editable_list_widget.events(EditableText._okCancelEvents('.editable-list-input', okCancelEvents, true));

Template.editable_list_widget.created = function() {
  this.selected = new ReactiveVar();
  this.showList = new ReactiveVar(true);
}

Template.editable_list_widget.onRendered(function() {
  var self = this;
  // only mrt:jquery-ui seems to make this `true` -> _.isFunction(this.$('.editable-list').sortable)
  // other jqueryui packages don't
  if (!(typeof self.data.userCanEdit !== 'undefined' && !self.data.userCanEdit) && EditableText.userCanEdit.call(self.data, self.data.context, Mongo.Collection.get(self.data.collection)) && _.isFunction(this.$('.editable-list').sortable)) {
    this.$('.editable-list').sortable({
      items: "> li:not(.editable-list-form)",
      start: function (e, ui) {
        self.selected.set(null);
      },
      update: function (e, ui) {
        var items = self.$(this).find('li:not(.editable-list-form)');
        var reordered = [];
				if (self.data.key) {
  				var listBeforeReordering = EditableText._drillDown(Mongo.Collection.get(self.data.collection).findOne({_id: self.data.context._id}), self.data.field) || [];
				  var updateMap = _.reduce(listBeforeReordering, function (memo, li, ind) {
						memo[ind] = li;
						return memo;
					}, {});
				}
        items.each(function (i) {
          var item = Blaze.getData(this);
					if (self.data.key) {
            reordered.push(updateMap[item.index]);
					}
					else {
						reordered.push(item.text);
					}
        });
        var mod = {};
        mod[self.data.field] = reordered;
        self.data.transactionUpdateText = self.data.transactionUpdateText || 'reorder list';
        Meteor.defer(function () { // Need to defer to avoid too much recursion
          // TODO -- add support for ['beforeReorder','afterReorder'] callbacks
          EditableText.update.call(self.data, Mongo.Collection.get(self.data.collection), self.data.context, {$set: mod});
          // What follows is a truly brutal blunt-force hack that creates unsightly flicker
          // but it keeps the Blaze data in sync with the field from the document being edited
          // If there's a better way to force a template redraw, I'd love to hear it
          self.showList.set(false);
          Tracker.flush();
          self.showList.set(true);
        });
      }
    });
  }
});

Template.editable_list_form.helpers({

  canEditList : function (data) {
    var userCanEdit = EditableText.userCanEdit.call(data, data.context, Mongo.Collection.get(data.collection));
    return (typeof data.userCanEdit !== 'undefined') ? (data.userCanEdit && userCanEdit) : userCanEdit;
  }

});
    
Template.editable_list_form.events({
  'submit .add-new-list-item, focusout .add-new-list-item input' : function (evt, tmpl) {
    evt.preventDefault();
    if (EditableText.userCanEdit.call(this, this.context, Mongo.Collection.get(this.collection))) {
      var inputElem = tmpl.$(evt.target).closest('.add-new-list-item').find('input');
      var newItem = $.trim(inputElem.val()).replace(/mml:/g, "");
      if (newItem !== '') {
        /*var updatedValue = {};
        updatedValue[this.field] = newItem;
        var modifier = {};
        modifier[(this.allowDuplicates) ? "$push" : "$addToSet"] = updatedValue;*/
		if (this.forceCase) {
		  switch (this.forceCase) {
			case 'lower' :
			  newItem = newItem.toLowerCase();
			  break;
			case 'upper' :
			  newItem = newItem.toUpperCase();
			  break;	
		  }
		}
        var currentValue = this.value || EditableText._drillDown(this.context, this.field) || [];
        if (!(this.allowDuplicates || currentValue.indexOf(newItem) === -1)) {
          inputElem.val('');
          return;    
        }
		if (this.key) {
          var newObj = {};
          newObj[this.key] = newItem;
          newItem = newObj;
		}
        currentValue.push(newItem);
        var updatedValue = {};
        updatedValue[this.field] = currentValue;
        var modifier = {"$set": updatedValue};
        this.beforeUpdate = this.beforeInsert;
        this.afterUpdate = this.afterInsert;
        EditableText.update.call(this, Mongo.Collection.get(this.collection), this.context, modifier, 'add to list');
        inputElem.val('');
      }
    }
  },
  'paste .add-new-list-item' : function (evt, tmpl) {
    if (this.allowPasteMultiple && EditableText.userCanEdit.call(this, this.context, Mongo.Collection.get(this.collection))) {
      var text = evt.originalEvent.clipboardData.getData("text/plain");
      var items = EditableList._processTextarea(text);
      if (items.length > 1) {
        evt.preventDefault();
        var self = this;
        var newItems = this.value || EditableText._drillDown(this.context, this.field) || [];
        _.each(items, function (item) {
          var newItem = $.trim(item.replace(/mml:/g, ""));
          if (_.isString(newItem) && newItem !== '') {
            if (self.key) {
              var newObj = {};
              newObj[self.key] = newItem;
              newItem = newObj;  
            }
            if (self.allowDuplcates) {
              newItems.push(newItem);
            }
            else {
              newItems = _.union(newItems, newItem);    
            }
          }
        });
        var updatedValue = {};
        updatedValue[this.field] = newItems;
        var modifier = {$set: updatedValue};
        this.beforeUpdate = this.beforeInsertMultiple;
        this.afterUpdate = this.afterInsertMultiple;
        EditableText.update.call(this, Mongo.Collection.get(this.collection), this.context, modifier, 'add to list');
      }
    }
  }
});