document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.text-field').forEach(function (wrapper) {
        var input = wrapper.querySelector('input');
        var button = wrapper.querySelector('.clear-btn');
        var updateButton = function () {
            if (input.value.length) {
                button.removeAttribute('hidden');
            } else {
                button.setAttribute('hidden', 'true');
            }
        };
        input.addEventListener('input', updateButton);
        button.addEventListener('click', function () {
            input.value = '';
            input.focus();
            updateButton();
        });
        updateButton();
    });
});
